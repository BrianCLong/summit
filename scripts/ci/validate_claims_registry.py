#!/usr/bin/env python3
"""
Validate governance/claims.registry.yaml against governance/claims.schema.json and
apply narrative-specific lint rules from ci/claim-lint-ruleset.yaml.

This script is intended for CI (see .github/workflows/claim-validation.yml) and
local use. It performs three layers of checks:
1) Schema validation (structure and required fields)
2) Rule enforcement (forbidden phrases, scope/strength channel limits)
3) Claim hygiene (evidence presence, comparative basis)
"""

import json
import sys
from pathlib import Path

import yaml
from jsonschema import validate

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "governance" / "claims.schema.json"
REGISTRY_PATH = REPO_ROOT / "governance" / "claims.registry.yaml"
RULESET_PATH = REPO_ROOT / "ci" / "claim-lint-ruleset.yaml"


def load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def fail(message: str) -> None:
    print(f"❌ {message}")
    sys.exit(1)


def schema_validate(registry, schema) -> None:
    try:
        validate(instance=registry, schema=schema)
    except Exception as exc:  # noqa: BLE001
        fail(f"Schema validation failed: {exc}")


def check_forbidden_phrases(text: str, phrases) -> list[str]:
    lower = text.lower()
    return [phrase for phrase in phrases if phrase in lower]


def ensure_evidence(claim, required: int) -> list[str]:
    evidence = claim.get("evidence", []) or []
    if len(evidence) < required:
        return [
            f"Claim {claim['id']} requires at least {required} evidence entries for strength '{claim['strength']}'"
        ]
    return []


def enforce_channel_rules(claim, ruleset) -> list[str]:
    issues = []
    channels = claim.get("channels", [])
    scope_rules = ruleset.get("scope_rules", {})

    if claim.get("scope") == "universal":
        allowed = set(scope_rules.get("universal", {}).get("allowed_channels", []))
        if allowed and not set(channels).issubset(allowed):
            issues.append(
                f"Claim {claim['id']} is universal but uses channels {channels}; allowed: {sorted(allowed)}"
            )

    if claim.get("scope") == "general":
        disallowed = set(scope_rules.get("general", {}).get("disallowed_channels", []))
        if disallowed.intersection(channels):
            issues.append(
                f"Claim {claim['id']} with general scope cannot target channels {sorted(disallowed.intersection(channels))}"
            )

    return issues


def enforce_comparative_basis(claim, ruleset) -> list[str]:
    issues = []
    if claim.get("category") != "comparative":
        return issues

    if not ruleset.get("comparative_requirements", {}).get("enforce_basis", False):
        return issues

    missing = []
    for field in ruleset.get("comparative_requirements", {}).get("basis_fields", []):
        value = claim.get(field)
        if not value:
            missing.append(field)

    if missing:
        issues.append(
            f"Claim {claim['id']} is comparative and missing basis fields: {', '.join(sorted(missing))}"
        )

    return issues


def enforce_intensity_rules(claim, ruleset) -> list[str]:
    issues = []
    intensity = ruleset.get("intensity_rules", {})

    if intensity.get("block_universal_strong") and claim.get("scope") == "universal" and claim.get("strength") == "strong":
        issues.append(f"Claim {claim['id']} cannot be strong + universal per lint policy")

    if intensity.get("public_channel_requires_evidence") and "public" in claim.get("channels", []) and not claim.get("evidence"):
        issues.append(f"Claim {claim['id']} targets public channel but has no evidence entries")

    return issues


def lint_claims(registry, ruleset) -> list[str]:
    issues: list[str] = []
    forbidden_phrases = ruleset.get("forbidden_phrases", [])
    evidence_requirements = ruleset.get("evidence_requirements", {})

    for claim in registry.get("claims", []):
        text = claim.get("text", "")
        forbidden_hits = check_forbidden_phrases(text, forbidden_phrases)
        if forbidden_hits:
            issues.append(
                f"Claim {claim['id']} contains forbidden phrasing: {', '.join(sorted(forbidden_hits))}"
            )

        required_evidence = evidence_requirements.get(claim.get("strength", ""), 0)
        issues.extend(ensure_evidence(claim, required_evidence))
        issues.extend(enforce_channel_rules(claim, ruleset))
        issues.extend(enforce_comparative_basis(claim, ruleset))
        issues.extend(enforce_intensity_rules(claim, ruleset))

    return issues


def main() -> None:
    if not SCHEMA_PATH.exists() or not REGISTRY_PATH.exists() or not RULESET_PATH.exists():
        fail("Required files are missing (schema, registry, or ruleset)")

    registry = load_yaml(REGISTRY_PATH)
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    ruleset = load_yaml(RULESET_PATH)

    schema_validate(registry, schema)
    lint_issues = lint_claims(registry, ruleset)

    if lint_issues:
        for issue in lint_issues:
            print(f"❌ {issue}")
        fail(f"Claim lint failed with {len(lint_issues)} issue(s)")

    print("✅ Claims registry validated and linted successfully")


if __name__ == "__main__":
    main()
