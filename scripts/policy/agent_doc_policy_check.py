#!/usr/bin/env python3
"""Policy lint for generated agent docs."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REQUIRED_FIELDS = {
    "module_name",
    "version",
    "input_schema",
    "output_schema",
    "policy_constraints",
    "side_effects",
    "deterministic",
    "evidence_id_pattern",
}


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_doc(path: Path, doc: dict) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED_FIELDS - set(doc.keys()))
    if missing:
        errors.append(f"{path}: missing required fields {missing}")

    policy_constraints = doc.get("policy_constraints")
    if not isinstance(policy_constraints, list) or not policy_constraints:
        errors.append(f"{path}: policy_constraints must be a non-empty list")

    side_effects = doc.get("side_effects")
    if not isinstance(side_effects, list) or not side_effects:
        errors.append(f"{path}: side_effects must be a non-empty list")
    else:
        for index, side_effect in enumerate(side_effects):
            if not isinstance(side_effect, dict):
                errors.append(f"{path}: side_effects[{index}] must be an object")
                continue
            for field in ("name", "effect_type", "scope"):
                value = side_effect.get(field)
                if not isinstance(value, str) or not value.strip():
                    errors.append(
                        f"{path}: side_effects[{index}].{field} must be a non-empty string"
                    )

    if doc.get("deterministic") is not True:
        errors.append(f"{path}: deterministic must be true")

    pattern = doc.get("evidence_id_pattern")
    if not isinstance(pattern, str) or not pattern:
        errors.append(f"{path}: evidence_id_pattern must be a non-empty string")
    else:
        try:
            re.compile(pattern)
        except re.error as exc:
            errors.append(f"{path}: evidence_id_pattern is not valid regex: {exc}")

    return errors


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]

    parser = argparse.ArgumentParser(description="Validate policy constraints in agent docs.")
    parser.add_argument(
        "--input-dir",
        default=str(repo_root / "spec" / "agents"),
        help="Directory containing *.agent.json artifacts.",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    docs = sorted(input_dir.glob("*.agent.json"))
    if not docs:
        print(f"FAIL no agent docs found in {input_dir}")
        return 1

    violations: list[str] = []
    for doc_path in docs:
        doc = _read_json(doc_path)
        violations.extend(_validate_doc(doc_path, doc))

    if violations:
        print("FAIL agent-doc policy lint violations:")
        for violation in violations:
            print(f"  - {violation}")
        return 1

    print(f"OK policy constraints validated for {len(docs)} agent doc(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
