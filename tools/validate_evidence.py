#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
PACK_PATH = ROOT / "prompts" / "packs" / "research_productivity_v1" / "pack.yaml"
SCHEMA_PATH = ROOT / "evidence" / "schemas" / "research_session.schema.json"
FIXTURES_PATH = ROOT / "evidence" / "fixtures"


def fail(message: str) -> None:
    print(f"[FAIL] {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Unable to read JSON {path}: {exc}")


def load_pack_contracts() -> dict:
    if not PACK_PATH.exists():
        fail(f"Pack definition missing: {PACK_PATH}")
    try:
        pack = yaml.safe_load(PACK_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Unable to parse pack YAML {PACK_PATH}: {exc}")
    templates = pack.get("templates", [])
    contracts = {}
    for template in templates:
        template_id = template.get("id")
        contract = template.get("output_contract", [])
        if not template_id or not contract:
            fail(f"Template missing id or output_contract in {PACK_PATH}")
        contracts[template_id] = contract
    return contracts


def validate_fixture(path: Path, schema: dict, contracts: dict) -> list[str]:
    errors = []
    data = load_json(path)
    validator = Draft202012Validator(schema)
    for error in validator.iter_errors(data):
        errors.append(error.message)

    template_id = data.get("template_id")
    outputs = data.get("outputs", {})
    if template_id not in contracts:
        errors.append(f"Unknown template_id '{template_id}'")
    else:
        for key in contracts[template_id]:
            if key not in outputs:
                errors.append(f"Missing output_contract key '{key}'")

    return errors


def main() -> int:
    if not SCHEMA_PATH.exists():
        fail(f"Schema not found: {SCHEMA_PATH}")

    schema = load_json(SCHEMA_PATH)
    contracts = load_pack_contracts()

    if not FIXTURES_PATH.exists():
        fail(f"Fixtures directory not found: {FIXTURES_PATH}")

    fixture_paths = sorted(FIXTURES_PATH.glob("research_*.json"))
    if not fixture_paths:
        fail("No research fixtures found")

    had_error = False
    for fixture in fixture_paths:
        expected_fail = fixture.name.startswith("research_fail_")
        errors = validate_fixture(fixture, schema, contracts)
        if expected_fail:
            if not errors:
                print(f"[FAIL] {fixture} expected to fail but passed")
                had_error = True
            else:
                print(f"[PASS] {fixture} failed as expected")
        else:
            if errors:
                print(f"[FAIL] {fixture} failed validation:")
                for error in errors:
                    print(f"  - {error}")
                had_error = True
            else:
                print(f"[PASS] {fixture} validated")

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
