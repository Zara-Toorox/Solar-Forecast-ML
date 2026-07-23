"""Secret-safe display helpers."""


def mask_license_key(value: str) -> str:
    if not isinstance(value, str) or len(value) < 16 or not value.startswith("EAI1."):
        return "****"
    return f"{value[:9]}…{value[-4:]}"
