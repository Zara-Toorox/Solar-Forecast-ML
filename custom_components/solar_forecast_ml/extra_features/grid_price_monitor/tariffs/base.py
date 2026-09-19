"""Shared tariff slot types."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol


@dataclass(frozen=True)
class PriceSlot:
    timestamp: datetime
    price: float
    hour: int
    date: str
    total_price: float
    price_source: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "price": self.price,
            "hour": self.hour,
            "date": self.date,
            "total_price": self.total_price,
            "price_source": self.price_source,
        }


class PriceSource(Protocol):
    mode: str
    label: str
    has_spot_component: bool
    needs_network: bool

    async def async_get_slots(
        self, window_start_local: datetime, window_end_local: datetime
    ) -> list[dict[str, Any]] | None:
        ...


def week_schedule_prices(source: Any, week_start: datetime) -> list[list[float]]:
    """Return 7x24 gross prices for a typical Monday–Sunday week."""
    start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    days: list[list[float]] = []
    for day in range(7):
        hours: list[float] = []
        for hour in range(24):
            local = start + timedelta(days=day, hours=hour)
            hours.append(round(float(source.price_for(local)), 4))
        days.append(hours)
    return days


def iter_local_hours(start_local_naive: datetime, end_local_naive: datetime):
    """Walk local hours using the aWATTar timezone convention."""
    start = start_local_naive.astimezone()
    end = end_local_naive.astimezone()
    t = start.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
    seen: set[datetime] = set()
    while t < end.astimezone(timezone.utc):
        local = t.astimezone()
        naive = local.replace(tzinfo=None, minute=0, second=0, microsecond=0)
        if naive not in seen:
            seen.add(naive)
            yield naive, local
        t += timedelta(hours=1)
