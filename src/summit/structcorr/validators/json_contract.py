from __future__ import annotations

import json
from typing import Any

_ALLOWED_TYPES = {"object": dict, "array": list, "string": str, "number": (int, float), "boolean": bool}


def validate_json_contract(payload: str, contract: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    contract = contract or {}

    try:
        parsed = json.loads(payload)
        findings.append(
            {
                "rule": "json.parseable",
                "severity": "info",
                "message": "JSON payload parsed successfully",
                "meta": {},
            }
        )
    except json.JSONDecodeError as error:
        findings.append(
            {
                "rule": "json.parseable",
                "severity": "fail",
                "message": f"Invalid JSON: {error.msg}",
                "meta": {"position": error.pos},
            }
        )
        return findings

    required_keys = contract.get("required_keys", [])
    if required_keys:
        if not isinstance(parsed, dict):
            findings.append(
                {
                    "rule": "json.required_keys",
                    "severity": "fail",
                    "message": "Required keys contract requires top-level object",
                    "meta": {"missing": required_keys},
                }
            )
        else:
            missing = sorted(key for key in required_keys if key not in parsed)
            findings.append(
                {
                    "rule": "json.required_keys",
                    "severity": "fail" if missing else "info",
                    "message": "Missing required keys" if missing else "Required keys present",
                    "meta": {"missing": missing},
                }
            )

    type_contract = contract.get("top_level_type")
    if type_contract:
        expected_type = _ALLOWED_TYPES.get(type_contract)
        matches = bool(expected_type and isinstance(parsed, expected_type))
        findings.append(
            {
                "rule": "json.top_level_type",
                "severity": "info" if matches else "fail",
                "message": "Top-level type matches contract" if matches else "Top-level type mismatch",
                "meta": {"expected": type_contract, "actual": type(parsed).__name__},
            }
        )

    return findings
