#!/usr/bin/env python3
"""Lint Summit Agent Specification Standard (SASS) documents."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import yaml
from jsonschema import Draft202012Validator

SCHEMA_PATH = Path("specs/schema/sass.schema.json")


def iter_spec_files(patterns: list[str]) -> Iterable[Path]:
    for pattern in patterns:
        yield from sorted(Path(".").glob(pattern))


def governance_checks(payload: dict) -> list[tuple[str, bool, str]]:
    guardrails = payload.get("guardrails", {})
    never_rules = [rule.lower() for rule in guardrails.get("never", []) if isinstance(rule, str)]
    ci_checks = [check.lower() for check in payload.get("validation", {}).get("ci_checks", []) if isinstance(check, str)]

    return [
        (
            "guardrails_present",
            bool(guardrails.get("always") and guardrails.get("ask_first") and guardrails.get("never")),
            "Guardrails must define always, ask_first, and never sections.",
        ),
        (
            "never_blocks_secrets",
            any("secret" in rule for rule in never_rules),
            "Never rules must prohibit secret access.",
        ),
        (
            "never_blocks_policy_bypass",
            any("policy" in rule and ("override" in rule or "bypass" in rule) for rule in never_rules),
            "Never rules must prohibit policy override/bypass.",
        ),
        (
            "policy_compliant_ci_check_present",
            "policy_compliant" in ci_checks,
            "validation.ci_checks must include policy_compliant.",
        ),
    ]


def lint_spec(schema: dict, spec_file: Path) -> int:
    print(f"Linting {spec_file}")

    try:
        payload = yaml.safe_load(spec_file.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        print(f"❌ yaml_valid: {exc}")
        return 1

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(payload), key=lambda item: item.path)

    if errors:
        print("❌ schema_valid")
        for issue in errors:
            path = ".".join(str(part) for part in issue.path) or "<root>"
            print(f"  - {path}: {issue.message}")
        return 1

    print("✔ schema_valid")

    failed = False
    for name, ok, message in governance_checks(payload):
        if ok:
            print(f"✔ {name}")
        else:
            print(f"⚠ {name}: {message}")
            failed = True

    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint SASS specs.")
    parser.add_argument("patterns", nargs="+", help="Glob patterns to lint, e.g. agents/**/*.yaml")
    args = parser.parse_args()

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    files = list(iter_spec_files(args.patterns))
    if not files:
        print("No files matched the provided patterns.")
        return 0

    exit_code = 0
    for spec_file in files:
        exit_code |= lint_spec(schema, spec_file)

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
