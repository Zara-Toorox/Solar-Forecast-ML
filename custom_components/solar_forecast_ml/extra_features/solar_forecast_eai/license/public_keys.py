"""Production public-key registry.

Public keys are added only after the product owner provisions the corresponding
private key in an explicitly approved, non-versioned admin location.
"""

PRODUCTION_PUBLIC_KEYS: dict[str, bytes] = {
    "eai-prod-2026-01": bytes.fromhex(
        "9667bbb882f6538db625885b291aae275a1ee15de680f216f19dc47304ec4d6a"
    )
}
