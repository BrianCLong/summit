from __future__ import annotations

import re
from typing import Any, Mapping

# Enforce EVID-<component>-<hash8>
EVIDENCE_ID_PATTERN = re.compile(r"^EVID-[A-Z0-9]+-[A-F0-9]{8}$", re.IGNORECASE)

def _require_keys(payload: Mapping[str, Any], required: set[str]) -> None:
    missing = required - set(payload.keys())
    if missing:
        raise ValueError(f"Missing required keys: {sorted(missing)}")

def _validate_evidence_id(value: Any) -> None:
    if not isinstance(value, str) or not EVIDENCE_ID_PATTERN.match(value):
        raise ValueError("evidence_id must match ^EVID-<component>-<hash8>$")

def validate_artifact(payload: Mapping[str, Any]) -> None:
    _require_keys(payload, {"evidence_id", "claim_ref"})
    _validate_evidence_id(payload["evidence_id"])
    if not isinstance(payload["claim_ref"], str):
        raise ValueError("claim_ref must be a string")
