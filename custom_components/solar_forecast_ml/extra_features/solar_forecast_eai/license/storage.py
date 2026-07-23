"""Config-entry license storage helpers."""

from typing import Any

from ..const import CONF_LICENSE_KEY


def license_key_from_entry(data: dict[str, Any]) -> str:
    value = data.get(CONF_LICENSE_KEY)
    return value if isinstance(value, str) else ""
