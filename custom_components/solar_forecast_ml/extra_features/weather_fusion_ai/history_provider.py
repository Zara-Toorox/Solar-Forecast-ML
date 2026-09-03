"""Entry-scoped, read-only actual-weather history provider."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from functools import partial
from typing import Any, Iterable
from zoneinfo import ZoneInfo

from .blend_math import circular_average as _circular_average


HISTORY_CONTRACT_VERSION = 1
MAX_SERIES_POINTS = 720
MAX_RANGE_DAYS = 730
PUBLIC_METRICS = frozenset(
    {
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "wind_direction",
        "precipitation",
        "cloud_cover",
    }
)
METRIC_UNITS = {
    "temperature": "°C",
    "humidity": "%",
    "pressure": "hPa",
    "wind_speed": "km/h",
    "wind_direction": "°",
    "precipitation": "mm",
    "cloud_cover": "%",
}
RECORDER_UNITS = {
    "temperature": "°C",
    "humidity": "%",
    "pressure": "hPa",
    "speed": "km/h",
    "precipitation": "mm",
}


class WeatherFusionHistoryProvider:
    """Expose bounded actual-weather history without source configuration."""

    contract_version = HISTORY_CONTRACT_VERSION

    def __init__(
        self,
        actual_tracker: Any,
        time_zone: str | None = None,
        *,
        hass: Any = None,
        sensors: dict[str, str | None] | None = None,
    ) -> None:
        self._actual_tracker = actual_tracker
        self._hass = hass
        self._sensors = dict(sensors or getattr(actual_tracker, "sensors", {}) or {})
        try:
            self._time_zone = ZoneInfo(time_zone) if time_zone else timezone.utc
        except (ValueError, TypeError):
            self._time_zone = timezone.utc

    async def actual_series(
        self,
        start: str | datetime,
        end: str | datetime,
        metrics: Iterable[str] | None = None,
        limit: int = MAX_SERIES_POINTS,
    ) -> dict[str, Any]:
        """Return a bounded UTC series of public actual-weather values."""
        selected = _selected_metrics(metrics)
        samples, start_at, end_at = await self._samples(start, end, selected)
        limit = max(1, min(int(limit), MAX_SERIES_POINTS))
        truncated = len(samples) > limit
        if truncated:
            samples = samples[-limit:]
        return self._response(
            status="partial" if truncated else ("ok" if samples else "unavailable"),
            start_at=start_at,
            end_at=end_at,
            samples=samples,
            data=samples,
            extra={"limit": limit},
        )

    async def actual_aggregates(
        self,
        start: str | datetime,
        end: str | datetime,
        metrics: Iterable[str] | None = None,
        granularity: str = "daily",
    ) -> dict[str, Any]:
        """Return safe hourly or daily aggregates over the requested period."""
        if granularity not in {"hourly", "daily"}:
            raise ValueError("granularity must be 'hourly' or 'daily'")
        selected = _selected_metrics(metrics)
        samples, start_at, end_at = await self._samples(start, end, selected)
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for sample in samples:
            observed = datetime.fromisoformat(sample["observed_at"])
            key = observed.strftime("%Y-%m-%dT%H:00:00+00:00") if granularity == "hourly" else observed.date().isoformat()
            groups[key].append(sample["values"])

        data = []
        for bucket, values in sorted(groups.items()):
            aggregate: dict[str, Any] = {"period": bucket, "values": {}}
            for metric in selected:
                numeric = [item[metric] for item in values if metric in item]
                if not numeric:
                    continue
                if metric == "wind_direction":
                    aggregate["values"][metric] = _circular_average(numeric)
                else:
                    aggregate["values"][metric] = {
                        "min": min(numeric),
                        "max": max(numeric),
                        "avg": round(sum(numeric) / len(numeric), 3),
                        "count": len(numeric),
                    }
            if aggregate["values"]:
                data.append(aggregate)
        return self._response(
            status="ok" if data else "unavailable",
            start_at=start_at,
            end_at=end_at,
            samples=samples,
            data=data,
            extra={"granularity": granularity},
        )

    async def recorder_aggregates(
        self,
        start: str | datetime,
        end: str | datetime,
        metrics: Iterable[str] | None = None,
        granularity: str = "hourly",
    ) -> dict[str, Any]:
        """Return recorder-backed aggregates for configured station sensors.

        Entity IDs remain private. The public result uses the same metric
        vocabulary as ``actual_aggregates`` and fails closed when Recorder or
        long-term statistics are unavailable.
        """
        if granularity not in {"hourly", "daily", "monthly"}:
            raise ValueError("granularity must be 'hourly', 'daily' or 'monthly'")
        selected = _selected_metrics(metrics)
        start_at, end_at = _range(start, end)
        metric_entities = {
            metric: entity_id
            for metric in selected
            if (entity_id := self._sensors.get(_sensor_key(metric)))
        }
        if self._hass is None or not metric_entities:
            return self._recorder_response(
                "unavailable", start_at, end_at, [], granularity, selected
            )

        try:
            from homeassistant.components.recorder.statistics import (
                statistics_during_period,
            )
            from homeassistant.helpers.recorder import get_instance

            query = partial(
                statistics_during_period,
                self._hass,
                start_at,
                end_at,
                set(metric_entities.values()),
                {"hourly": "hour", "daily": "day", "monthly": "month"}[
                    granularity
                ],
                RECORDER_UNITS,
                {"change", "max", "mean", "min", "state", "sum"},
            )
            raw = await get_instance(self._hass).async_add_executor_job(query)
        except Exception:  # noqa: BLE001 - Recorder is an optional read-only source
            return self._recorder_response(
                "unavailable", start_at, end_at, [], granularity, selected
            )

        by_period: dict[str, dict[str, Any]] = {}
        for metric, entity_id in metric_entities.items():
            rows = raw.get(entity_id, []) if isinstance(raw, dict) else []
            for row in rows if isinstance(rows, list) else []:
                if not isinstance(row, dict):
                    continue
                observed = _recorder_timestamp(row.get("start"))
                if observed is None:
                    continue
                period = _recorder_period(observed, granularity, self._time_zone)
                values = by_period.setdefault(
                    period, {"period": period, "values": {}}
                )["values"]
                aggregate = _recorder_metric(metric, row)
                if aggregate is not None:
                    values[metric] = aggregate

        data = [
            item
            for _, item in sorted(by_period.items())
            if isinstance(item.get("values"), dict) and item["values"]
        ]
        return self._recorder_response(
            "ok" if data else "unavailable",
            start_at,
            end_at,
            data,
            granularity,
            selected,
        )

    async def precipitation_total(
        self, start: str | datetime, end: str | datetime
    ) -> dict[str, Any]:
        """Return precipitation only when persisted semantics make it safe."""
        samples, start_at, end_at = await self._samples(start, end, {"precipitation"})
        enriched = [sample for sample in samples if "precipitation" in sample["values"]]
        semantics = {sample.get("precipitation_semantics") for sample in enriched}
        units = {sample.get("precipitation_unit") for sample in enriched}
        if not enriched or len(semantics) != 1 or "unknown" in semantics or len(units) != 1:
            return self._response("unavailable", start_at, end_at, samples, None, {})

        semantics_value = semantics.pop()
        unit = units.pop()
        values = [sample["values"]["precipitation"] for sample in enriched]
        resets = 0
        if semantics_value == "increment":
            total = sum(values)
            daily = _daily_increment(enriched)
        elif semantics_value == "rate":
            total = _integrate_hourly_rate(enriched)
            daily = _daily_rate(enriched)
        elif semantics_value == "counter":
            total = 0.0
            daily = defaultdict(float)
            for index, (previous, current) in enumerate(zip(values, values[1:]), start=1):
                if current >= previous:
                    amount = current - previous
                else:
                    amount = current
                    resets += 1
                total += amount
                current_sample = enriched[index]
                daily[current_sample["observed_at"][:10]] += amount
        else:
            return self._response("unavailable", start_at, end_at, samples, None, {})
        daily_values = [
            {"date": day, "total_mm": round(amount, 3)}
            for day, amount in sorted(daily.items())
        ]
        rain_days = sum(item["total_mm"] >= 0.2 for item in daily_values)
        dry_spell_max = _longest_dry_spell(daily_values)
        return self._response(
            "ok",
            start_at,
            end_at,
            samples,
            {
                "total": round(total, 3),
                "total_mm": round(total, 3),
                "semantics": semantics_value,
                "resets": resets,
                "daily": daily_values,
                "rain_days": rain_days,
                "dry_spell_days": dry_spell_max,
            },
            {"unit": unit},
        )

    async def _samples(
        self, start: str | datetime, end: str | datetime, metrics: set[str]
    ) -> tuple[list[dict[str, Any]], datetime, datetime]:
        start_at, end_at = _range(start, end)
        history = await self._actual_tracker.get_actual_weather_range(
            start_at.date().isoformat(), end_at.date().isoformat()
        )
        samples = []
        for hours in history.values():
            for raw in hours.values():
                observed = _utc_timestamp(raw.get("timestamp"), self._time_zone)
                if observed is None or not start_at <= observed <= end_at:
                    continue
                values = _public_values(raw, metrics)
                if values:
                    samples.append(
                        {
                            "observed_at": observed.isoformat(),
                            "values": values,
                            "precipitation_semantics": raw.get("precipitation_semantics", "unknown"),
                            "precipitation_unit": raw.get("precipitation_unit"),
                        }
                    )
        samples.sort(key=lambda item: item["observed_at"])
        return samples, start_at, end_at

    def _response(self, status, start_at, end_at, samples, data, extra):
        expected = max(1, int((end_at - start_at).total_seconds() // 3600) + 1)
        response = {
            "schema_version": self.contract_version,
            "status": status,
            "coverage": {"observations": len(samples), "expected_hours": expected, "ratio": round(len(samples) / expected, 3)},
            "unit": {metric: METRIC_UNITS[metric] for metric in _metrics_from_samples(samples)},
            "data_from": samples[0]["observed_at"] if samples else start_at.isoformat(),
            "data_to": samples[-1]["observed_at"] if samples else end_at.isoformat(),
            "data": data,
        }
        response.update(extra)
        return response

    @staticmethod
    def _recorder_response(
        status: str,
        start_at: datetime,
        end_at: datetime,
        data: list[dict[str, Any]],
        granularity: str,
        selected: set[str],
    ) -> dict[str, Any]:
        expected = {
            "hourly": max(1, int((end_at - start_at).total_seconds() // 3600)),
            "daily": max(1, (end_at.date() - start_at.date()).days + 1),
            "monthly": max(
                1,
                (end_at.year - start_at.year) * 12 + end_at.month - start_at.month + 1,
            ),
        }[granularity]
        return {
            "schema_version": HISTORY_CONTRACT_VERSION,
            "status": status,
            "source": "home_assistant_recorder",
            "coverage": {
                "observations": len(data),
                "expected_periods": expected,
                "ratio": round(min(1.0, len(data) / expected), 3),
            },
            "unit": {metric: METRIC_UNITS[metric] for metric in selected},
            "data_from": data[0]["period"] if data else start_at.isoformat(),
            "data_to": data[-1]["period"] if data else end_at.isoformat(),
            "granularity": granularity,
            "data": data,
        }


def _selected_metrics(metrics: Iterable[str] | None) -> set[str]:
    selected = PUBLIC_METRICS if metrics is None else set(metrics)
    invalid = selected - PUBLIC_METRICS
    if invalid:
        raise ValueError("unsupported history metric")
    return selected


def _range(start, end) -> tuple[datetime, datetime]:
    start_at = _utc_timestamp(start, timezone.utc, is_end=False)
    end_at = _utc_timestamp(end, timezone.utc, is_end=True)
    if (
        start_at is None
        or end_at is None
        or end_at < start_at
        or end_at - start_at > timedelta(days=MAX_RANGE_DAYS)
    ):
        raise ValueError("invalid time range")
    return start_at, end_at


def _utc_timestamp(value, assumed_zone, is_end=False) -> datetime | None:
    if isinstance(value, str) and len(value) == 10:
        value = datetime.combine(datetime.fromisoformat(value).date(), time.max if is_end else time.min)
    elif isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=assumed_zone)
    return value.astimezone(timezone.utc)


def _public_values(raw, metrics):
    values = {}
    for metric in metrics:
        if metric == "precipitation" and raw.get("precipitation_semantics") == "counter":
            value = raw.get("precipitation_counter")
            if value is None:
                value = raw.get("precipitation", raw.get("rain"))
        elif metric == "precipitation" and "precipitation" not in raw:
            value = raw.get("rain")
        else:
            value = raw.get(metric)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            values[metric] = float(value)
    return values


def _sensor_key(metric: str) -> str:
    return {
        "precipitation": "rain",
        "wind_direction": "wind_direction",
    }.get(metric, metric)


def _recorder_timestamp(value: Any) -> datetime | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            return datetime.fromtimestamp(value, timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    return _utc_timestamp(value, timezone.utc)


def _recorder_period(
    observed: datetime, granularity: str, local_time_zone: Any = timezone.utc
) -> str:
    if granularity == "hourly":
        return observed.strftime("%Y-%m-%dT%H:00:00+00:00")
    local_observed = observed.astimezone(local_time_zone)
    if granularity == "monthly":
        return local_observed.strftime("%Y-%m")
    return local_observed.date().isoformat()


def _recorder_metric(metric: str, row: dict[str, Any]) -> dict[str, Any] | float | None:
    if metric == "wind_direction":
        return _finite_number(row.get("mean"))
    numbers = {
        name: value
        for name in ("min", "max", "mean", "change", "sum", "state")
        if (value := _finite_number(row.get(name))) is not None
    }
    if not numbers:
        return None
    if metric == "precipitation":
        amount = numbers.get("change")
        if amount is not None:
            numbers["amount"] = max(0.0, amount)
    return {
        "min": numbers.get("min", numbers.get("mean")),
        "max": numbers.get("max", numbers.get("mean")),
        "avg": numbers.get("mean", numbers.get("state")),
        "count": 1,
        **({"amount": numbers["amount"]} if "amount" in numbers else {}),
    }


def _finite_number(value: Any) -> float | None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return None
    value = float(value)
    return value if value == value and value not in {float("inf"), float("-inf")} else None


def _metrics_from_samples(samples):
    return {metric for sample in samples for metric in sample["values"]}


def _integrate_hourly_rate(samples):
    total = 0.0
    for previous, current in zip(samples, samples[1:]):
        elapsed_hours = (datetime.fromisoformat(current["observed_at"]) - datetime.fromisoformat(previous["observed_at"])).total_seconds() / 3600
        if 0 < elapsed_hours <= 2:
            total += previous["values"]["precipitation"] * elapsed_hours
    return total


def _daily_increment(samples):
    daily = defaultdict(float)
    for sample in samples:
        daily[sample["observed_at"][:10]] += sample["values"]["precipitation"]
    return daily


def _daily_rate(samples):
    daily = defaultdict(float)
    for previous, current in zip(samples, samples[1:]):
        elapsed_hours = (
            datetime.fromisoformat(current["observed_at"])
            - datetime.fromisoformat(previous["observed_at"])
        ).total_seconds() / 3600
        if 0 < elapsed_hours <= 2:
            daily[previous["observed_at"][:10]] += (
                previous["values"]["precipitation"] * elapsed_hours
            )
    return daily


def _longest_dry_spell(daily_values):
    longest = 0
    current = 0
    previous = None
    for item in daily_values:
        day = datetime.fromisoformat(item["date"]).date()
        if previous is not None and (day - previous).days != 1:
            current = 0
        current = current + 1 if item["total_mm"] < 0.2 else 0
        longest = max(longest, current)
        previous = day
    return longest
