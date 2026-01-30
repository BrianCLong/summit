from typing import Any, Dict

from .protocol import PrivacyMechanism


def validate_update(data: dict[str, Any]) -> None:
    # Check for raw gradients/payloads (fail safe) - Check this FIRST
    if "weights" in data or "gradients" in data or "payload" in data:
         raise ValueError("Raw payload fields are not allowed in the update contract")

    required_fields = {
        "participant_id", "round_id", "model_hash",
        "update_hash", "privacy_mechanism", "governance", "metrics"
    }

    keys = set(data.keys())
    unknown = keys - required_fields
    if unknown:
        raise ValueError(f"Unknown fields in ParticipantUpdate: {unknown}")

    # Check privacy mechanism
    pm = data.get("privacy_mechanism")
    if pm not in [m.value for m in PrivacyMechanism]:
        raise ValueError(f"Invalid privacy mechanism: {pm}")

    # Check governance
    gov = data.get("governance", {})
    if not isinstance(gov, dict):
        raise ValueError("governance must be a dictionary")

    gov_required = {"classification", "retention_ttl_days"}
    if not gov_required.issubset(gov.keys()):
        raise ValueError(f"Missing governance fields: {gov_required - gov.keys()}")
