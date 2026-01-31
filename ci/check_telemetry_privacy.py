#!/usr/bin/env python3
"""
CI Gate: telemetry_privacy_gate
Deny-by-default: fail if any telemetry event field is unannotated or violates
restricted PII transform requirements.
"""
from __future__ import annotations

import json
import pathlib
import sys
from typing import Dict, List

ROOT = pathlib.Path(__file__).resolve().parents[1]
ALLOWLIST_PATH = ROOT / "telemetry/privacy/allowlist.json"
EVENT_SCHEMA_PATH = ROOT / "events/schema/event.schema.json"

ALLOWED_CLASSIFICATIONS = {
    "PUBLIC",
    "INTERNAL",
    "PSEUDONYMIZED",
    "SENSITIVE",
    "RESTRICTED_PII",
}
ALLOWED_TRANSFORMS = {
    "ALLOW",
    "DROP",
    "MASK",
    "PSEUDONYMIZE",
    "HASH_STRUCTURED",
    "NOISE_TIME",
    "DP_AGG_ONLY",
}
ALLOWED_LINKABILITY = {"NONE", "INTRA_DOMAIN", "CROSS_DOMAIN"}
RESTRICTED_TRANSFORM_BLOCKLIST = {"ALLOW"}


def fail(message: str) -> None:
    print(f"[telemetry_privacy_gate] FAIL: {message}")
    sys.exit(1)


def load_json(path: pathlib.Path) -> dict[str, object]:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        fail(f"missing required file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")
    raise RuntimeError("unreachable")


def validate_allowlist(allowlist: dict[str, dict[str, object]]) -> None:
    for field, policy in allowlist.items():
        if not isinstance(policy, dict):
            fail(f"allowlist entry for {field} must be an object")
        classification = policy.get("classification")
        transform = policy.get("transform")
        linkability = policy.get("linkability")
        if classification not in ALLOWED_CLASSIFICATIONS:
            fail(f"field {field} has invalid classification: {classification}")
        if transform not in ALLOWED_TRANSFORMS:
            fail(f"field {field} has invalid transform: {transform}")
        if linkability not in ALLOWED_LINKABILITY:
            fail(f"field {field} has invalid linkability: {linkability}")
        if (
            classification == "RESTRICTED_PII"
            and transform in RESTRICTED_TRANSFORM_BLOCKLIST
        ):
            fail(f"field {field} cannot ALLOW restricted PII")


def validate_event_schema(
    allowlist: dict[str, dict[str, object]],
    event_schema: dict[str, object],
) -> None:
    missing_fields: list[str] = [
        key for key in event_schema.keys() if key not in allowlist
    ]
    if missing_fields:
        fail(f"unannotated event fields: {', '.join(sorted(missing_fields))}")


def main() -> None:
    allowlist = load_json(ALLOWLIST_PATH)
    event_schema = load_json(EVENT_SCHEMA_PATH)
    validate_allowlist(allowlist)
    validate_event_schema(allowlist, event_schema)
    print("[telemetry_privacy_gate] OK")


if __name__ == "__main__":
    main()
