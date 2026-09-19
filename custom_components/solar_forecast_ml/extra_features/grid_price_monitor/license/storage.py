"""Config-entry license storage helpers."""

from typing import Any

CONF_LICENSE_KEY = "license_key"


def license_key_from_entry(data: dict[str, Any]) -> str:
    value = data.get(CONF_LICENSE_KEY)
    if not isinstance(value, str):
        return ""
    return value.strip()
