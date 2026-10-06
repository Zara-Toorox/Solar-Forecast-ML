# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

# Log format for GPM
LOG_FORMAT = "%(asctime)s - %(levelname)s - [%(name)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Maximum log file size (5 MB)
MAX_LOG_SIZE = 5 * 1024 * 1024

# Number of backup files to keep
BACKUP_COUNT = 12  # Keep 12 months


def _dev_mode_active(hass: Any) -> bool:
    """True only when SFML published dev_mode.active as True. @zara"""
    if hass is None:
        return False
    try:
        data = getattr(hass, "data", None)
        if data is None or not hasattr(data, "get"):
            return False
        solar = data.get("solar_forecast_ml", {})
        if solar is None or not hasattr(solar, "get"):
            return False
        dev_mode = solar.get("dev_mode", {})
        if dev_mode is None or not hasattr(dev_mode, "get"):
            return False
        return dev_mode.get("active") is True
    except (AttributeError, TypeError, KeyError):
        return False


def _log_level_for_hass(hass: Any) -> int:
    """File log level: DEBUG in DEV, otherwise INFO. @zara"""
    if _dev_mode_active(hass):
        return logging.DEBUG
    return logging.INFO


class _WarningToParentHandler(logging.Handler):
    """Forward WARNING and above to the parent logger. @zara"""

    def __init__(self, logger: logging.Logger) -> None:
        super().__init__(level=logging.WARNING)
        self._logger = logger

    def emit(self, record: logging.LogRecord) -> None:
        parent = self._logger.parent
        if parent is None or not parent.isEnabledFor(record.levelno):
            return
        parent.handle(record)


class GPMLogger:
    """Custom logger for Solar Forecast GPM @zara

    Note: This is NOT a singleton anymore to avoid issues with HA reloads.
    Each integration instance gets its own logger.
    """

    def __init__(self, logs_path: Path | None = None, hass: "HomeAssistant | None" = None) -> None:
        """Initialize the GPM logger @zara

        Args:
            logs_path: Path to the logs directory
            hass: Home Assistant instance for async executor jobs
        """
        self._logs_path = logs_path
        self._file_handler: RotatingFileHandler | None = None
        self._logger = logging.getLogger(f"grid_price_monitor.gpm.{id(self)}")
        self._logger.setLevel(_log_level_for_hass(hass))
        self._hass = hass
        self._logger.propagate = False
        has_forward = any(
            isinstance(handler, _WarningToParentHandler)
            for handler in self._logger.handlers
        )
        if not has_forward:
            self._logger.addHandler(_WarningToParentHandler(self._logger))

    async def _run_in_executor(self, func):
        """Run a function in executor, using hass if available @zara"""
        if self._hass:
            return await self._hass.async_add_executor_job(func)
        return await asyncio.get_running_loop().run_in_executor(None, func)

    async def async_setup_file_logging(self, logs_path: Path) -> bool:
        """Set up file logging asynchronously @zara

        Args:
            logs_path: Path to the logs directory

        Returns:
            True if setup was successful
        """
        def _setup() -> bool:
            try:
                self._logs_path = logs_path

                # Ensure logs directory exists
                logs_path.mkdir(parents=True, exist_ok=True)

                # Create log file path with current month
                log_file = self._get_current_log_file()

                # Remove existing file handler if any
                if self._file_handler:
                    self._logger.removeHandler(self._file_handler)

                # Create rotating file handler
                self._file_handler = RotatingFileHandler(
                    log_file,
                    maxBytes=MAX_LOG_SIZE,
                    backupCount=BACKUP_COUNT,
                    encoding="utf-8",
                )
                level = _log_level_for_hass(self._hass)
                self._logger.setLevel(level)
                self._file_handler.setLevel(level)

                # Set formatter
                formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
                self._file_handler.setFormatter(formatter)

                # Add handler to logger
                self._logger.addHandler(self._file_handler)

                self._logger.info("=" * 60)
                self._logger.info("Solar Forecast GPM logging initialized")
                self._logger.info("Log file: %s", log_file)
                self._logger.info("=" * 60)

                return True

            except Exception as err:
                logging.getLogger(__name__).error(
                    "Failed to setup GPM file logging: %s", err
                )
                return False

        return await self._run_in_executor(_setup)

    def _get_current_log_file(self) -> Path:
        """Get the current log file path @zara

        Returns:
            Path to the current month's log file
        """
        if not self._logs_path:
            raise ValueError("Logs path not set")

        filename = f"gpm_{datetime.now().strftime('%Y-%m')}.log"
        return self._logs_path / filename

    def debug(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log debug message @zara"""
        self._logger.debug(message, *args, **kwargs)

    def info(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log info message @zara"""
        self._logger.info(message, *args, **kwargs)

    def warning(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log warning message @zara"""
        self._logger.warning(message, *args, **kwargs)

    def error(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log error message @zara"""
        self._logger.error(message, *args, **kwargs)

    def critical(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log critical message @zara"""
        self._logger.critical(message, *args, **kwargs)

    def exception(self, message: str, *args: Any, **kwargs: Any) -> None:
        """Log exception with traceback @zara"""
        self._logger.exception(message, *args, **kwargs)

    def log_price_update(
        self,
        spot_price: float | None,
        total_price: float | None,
        is_cheap: bool
    ) -> None:
        """Log a price update @zara

        Args:
            spot_price: Current spot price
            total_price: Current total price
            is_cheap: Whether current price is below threshold
        """
        status = "CHEAP" if is_cheap else "NORMAL"
        self._logger.info(
            "Price Update: Spot=%.2f ct/kWh, Total=%.2f ct/kWh [%s]",
            spot_price or 0,
            total_price or 0,
            status,
        )

    def log_api_fetch(
        self,
        success: bool,
        country: str,
        entries: int = 0,
        error: str | None = None
    ) -> None:
        """Log an API fetch operation @zara

        Args:
            success: Whether the fetch was successful
            country: Country code
            entries: Number of price entries fetched
            error: Error message if failed
        """
        if success:
            self._logger.info(
                "API Fetch: Success - %d entries for %s",
                entries,
                country,
            )
        else:
            self._logger.warning(
                "API Fetch: Failed for %s - %s",
                country,
                error or "Unknown error",
            )

    def log_battery_charge(
        self,
        power_w: float,
        energy_today_kwh: float,
        energy_month_kwh: float
    ) -> None:
        """Log battery charging activity @zara

        Args:
            power_w: Current charging power in W
            energy_today_kwh: Energy charged today in kWh
            energy_month_kwh: Energy charged this month in kWh
        """
        self._logger.debug(
            "Battery: %.0f W, Today=%.3f kWh, Month=%.3f kWh",
            power_w,
            energy_today_kwh,
            energy_month_kwh,
        )

    def log_config_change(self, changes: dict[str, Any]) -> None:
        """Log configuration changes @zara

        Args:
            changes: Dictionary of changed values
        """
        self._logger.info("Configuration changed: %s", changes)

    def shutdown(self) -> None:
        """Shutdown the logger @zara"""
        if self._file_handler:
            self._logger.info("Solar Forecast GPM logging shutdown")
            self._logger.removeHandler(self._file_handler)
            self._file_handler.close()
            self._file_handler = None


async def async_setup_gpm_logging(logs_path: Path, hass: "HomeAssistant | None" = None) -> GPMLogger:
    """Set up GPM logging asynchronously and return logger instance @zara

    Args:
        logs_path: Path to the logs directory
        hass: Home Assistant instance for async executor jobs

    Returns:
        Configured GPMLogger instance
    """
    logger = GPMLogger(logs_path, hass)
    await logger.async_setup_file_logging(logs_path)
    return logger
