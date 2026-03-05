#!/usr/bin/env python3
"""Deterministic business plan + formation readiness scorer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

EVIDENCE_PREFIX = "EVID-BIZPLAN"
SCHEMA_PATH = Path("schemas/business_plan.schema.json")


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_present(value: Any) -> bool:
    if isinstance(value, bool):
        return True
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, tuple, dict)):
        return len(value) > 0
    return True


def _validate_required_fields(payload: dict[str, Any], schema: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for key in schema.get("required", []):
        if not _is_present(payload.get(key)):
            missing.append(key)

    required_by_section = {
        "formation": ["legal_structure", "registered", "licenses_permits"],
        "financials": ["startup_costs", "funding_strategy", "projected_income", "projected_expenses"],
        "banking": ["separate_business_bank_account"],
    }
    for section, required in required_by_section.items():
        section_data = payload.get(section, {})
        if not isinstance(section_data, dict):
            missing.extend([f"{section}.{field}" for field in required])
            continue
        for field in required:
            if not _is_present(section_data.get(field)):
                missing.append(f"{section}.{field}")
    return missing


def score_readiness(payload: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    missing = _validate_required_fields(payload, schema)
    total_fields = len(schema.get("required", [])) + 8
    complete_fields = max(total_fields - len(missing), 0)
    score = round(complete_fields / total_fields, 4)
    mandatory_formation_missing = any(field.startswith("formation.") for field in missing)
    status = "deny" if mandatory_formation_missing or score < 0.70 else "pass"
    return {
        "score": score,
        "threshold": 0.70,
        "status": status,
        "mandatory_formation_missing": mandatory_formation_missing,
        "missing_fields": sorted(missing),
    }


def _stable_write(path: Path, content: dict[str, Any]) -> None:
    path.write_text(json.dumps(content, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to startup business plan JSON")
    parser.add_argument("--out-dir", default="artifacts", help="Output directory")
    args = parser.parse_args()

    payload = _load_json(Path(args.input))
    schema = _load_json(SCHEMA_PATH)
    scored = score_readiness(payload, schema)
    output_dir = Path(args.out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    evidence_id = f"{EVIDENCE_PREFIX}-001"

    report = {
        "evidence_id": evidence_id,
        "module": "cnbc-bizplan-formation",
        "readiness": scored,
        "decision": "deny-by-default" if scored["status"] == "deny" else "allow",
    }
    metrics = {
        "evidence_id": evidence_id,
        "metrics": {
            "readiness_score": scored["score"],
            "mandatory_missing": len(scored["missing_fields"]),
            "threshold": scored["threshold"],
        },
    }
    stamp = {
        "evidence_id": evidence_id,
        "deterministic": True,
        "stamp_version": "1",
        "generator": "pipelines/bizplan_readiness.py",
    }

    _stable_write(output_dir / "report.json", report)
    _stable_write(output_dir / "metrics.json", metrics)
    _stable_write(output_dir / "stamp.json", stamp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
