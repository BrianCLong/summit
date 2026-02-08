#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

EVIDENCE_INDEX = Path("evidence/index.json")
INDEX_SCHEMA = Path("evidence/schemas/index.schema.json")
REPORT_SCHEMA = Path("evidence/schemas/report.schema.json")
METRICS_SCHEMA = Path("evidence/schemas/metrics.schema.json")
STAMP_SCHEMA = Path("evidence/schemas/stamp.schema.json")
COGWAR_SCHEMA_DIR = Path("schemas/cogwar")

REQUIRED_EVIDENCE_IDS = [
    "EVD-nato-cogwar-techfamilies-ai-001",
    "EVD-nato-cogwar-techfamilies-synth-001",
    "EVD-nato-cogwar-techfamilies-iw-001",
    "EVD-nato-cogwar-techfamilies-gov-001",
    "EVD-nato-cogwar-techfamilies-xr-001",
    "EVD-nato-cogwar-techfamilies-neuro-001",
]

ISO_TS = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")

DEPENDENCY_FILES = {
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "requirements.in",
    "requirements.txt",
    "pyproject.toml",
    "Cargo.toml",
    "Cargo.lock",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def validate_schema(schema_path: Path) -> Draft202012Validator:
    schema = load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def validate_index() -> dict:
    validator = validate_schema(INDEX_SCHEMA)
    index = load_json(EVIDENCE_INDEX)
    validator.validate(index)
    return index


def require_evidence_files(index: dict) -> int:
    missing = 0
    items = index.get("items", {})
    for evidence_id in REQUIRED_EVIDENCE_IDS:
        entry = items.get(evidence_id)
        if not entry:
            print(f"Missing evidence index entry: {evidence_id}")
            missing += 1
            continue
        files = entry.get("files") or entry.get("artifacts")
        if not files:
            print(f"Missing files list for {evidence_id}")
            missing += 1
            continue
        required_names = {"report.json", "metrics.json", "stamp.json"}
        found_names = {Path(path).name for path in files}
        if not required_names.issubset(found_names):
            print(f"Incomplete evidence files for {evidence_id}: {sorted(found_names)}")
            missing += 1
            continue
        for path in files:
            if not Path(path).exists():
                print(f"Evidence file missing on disk: {path}")
                missing += 1
    return missing


def validate_evidence_payloads() -> tuple[int, int]:
    report_validator = validate_schema(REPORT_SCHEMA)
    metrics_validator = validate_schema(METRICS_SCHEMA)
    stamp_validator = validate_schema(STAMP_SCHEMA)
    validated_files = 0
    errors = 0
    for evidence_id in REQUIRED_EVIDENCE_IDS:
        evidence_dir = Path("evidence") / evidence_id
        report = load_json(evidence_dir / "report.json")
        metrics = load_json(evidence_dir / "metrics.json")
        stamp = load_json(evidence_dir / "stamp.json")
        report_validator.validate(report)
        metrics_validator.validate(metrics)
        stamp_validator.validate(stamp)
        for field in ("evidence_id", "summary", "sources"):
            if field not in report:
                raise ValueError(f"{evidence_id} report missing {field}")
        validated_files += 3
    return validated_files, errors


def enforce_timestamp_isolation() -> int:
    violations = 0
    for evidence_id in REQUIRED_EVIDENCE_IDS:
        for path in (Path("evidence") / evidence_id).glob("*.json"):
            if path.name == "stamp.json":
                continue
            if ISO_TS.search(path.read_text()):
                print(f"Timestamp found outside stamp.json: {path}")
                violations += 1
    return violations


def validate_cogwar_schemas() -> int:
    errors = 0
    for schema_path in COGWAR_SCHEMA_DIR.glob("*.schema.json"):
        try:
            Draft202012Validator.check_schema(load_json(schema_path))
        except Exception as exc:
            print(f"Invalid JSON schema: {schema_path} ({exc})")
            errors += 1
    return errors


def parse_policy_terms(path: Path) -> tuple[list[str], list[str]]:
    deny_terms: list[str] = []
    allow_terms: list[str] = []
    section = None
    in_match = False
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("deny:"):
            section = "deny"
            in_match = False
            continue
        if stripped.startswith("allow:"):
            section = "allow"
            in_match = False
            continue
        if stripped.startswith("match:"):
            in_match = True
            continue
        if stripped.startswith("- "):
            value = stripped[2:].strip()
            if value.startswith("id:"):
                in_match = False
                continue
            if in_match and section == "deny":
                deny_terms.append(value)
            elif in_match and section == "allow":
                allow_terms.append(value)
    return deny_terms, allow_terms


def validate_policy_denies() -> int:
    policy_path = Path("policy/defensive_only.yml")
    deny_terms, _ = parse_policy_terms(policy_path)
    fixture_path = Path("tests/fixtures/policy/offensive_requests.txt")
    violations = 0
    for line in fixture_path.read_text().splitlines():
        prompt = line.strip()
        if not prompt:
            continue
        prompt_lower = prompt.lower()
        if not any(term.lower() in prompt_lower for term in deny_terms):
            print(f"Policy deny missing match for: {prompt}")
            violations += 1
    return violations


def validate_feature_flags() -> int:
    flags_path = Path("policy/innovation_flags.yml")
    values = {}
    for line in flags_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        if key.strip().startswith("FEATURE_"):
            values[key.strip()] = value.strip().strip('"')
    violations = 0
    for key in ("FEATURE_IW", "FEATURE_PROVENANCE", "FEATURE_INNOVATION"):
        if values.get(key) != "0":
            print(f"Feature flag must default OFF: {key}")
            violations += 1
    return violations


def changed_files() -> list[str]:
    base_ref = os.environ.get("GITHUB_BASE_REF")
    diff_range = f"origin/{base_ref}...HEAD" if base_ref else "HEAD~1...HEAD"
    try:
        output = subprocess.check_output(
            ["git", "diff", "--name-only", diff_range],
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("Unable to determine git diff range") from exc
    return [line.strip() for line in output.splitlines() if line.strip()]


def validate_dependency_delta() -> int:
    files = changed_files()
    if not files:
        return 0
    changed_deps = any(path in DEPENDENCY_FILES for path in files)
    if changed_deps and "deps/dependency_delta.md" not in files:
        print("Dependency change detected without deps/dependency_delta.md update")
        return 1
    return 0


def write_governance_metrics(schema_count: int, denied_count: int, evd_count: int) -> None:
    metrics_path = Path("evidence/EVD-nato-cogwar-techfamilies-gov-001/metrics.json")
    payload = {
        "evidence_id": "EVD-nato-cogwar-techfamilies-gov-001",
        "metrics": {
            "validated_schemas": schema_count,
            "denied_requests": denied_count,
            "evd_folders_verified": evd_count,
        },
    }
    metrics_path.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> int:
    index = validate_index()
    missing = require_evidence_files(index)
    schema_errors = validate_cogwar_schemas()
    timestamp_violations = enforce_timestamp_isolation()
    policy_violations = validate_policy_denies()
    flag_violations = validate_feature_flags()
    dep_violations = validate_dependency_delta()

    validate_evidence_payloads()

    write_governance_metrics(
        schema_count=len(list(COGWAR_SCHEMA_DIR.glob("*.schema.json"))),
        denied_count=policy_violations,
        evd_count=len(REQUIRED_EVIDENCE_IDS),
    )

    total = (
        missing
        + schema_errors
        + timestamp_violations
        + policy_violations
        + flag_violations
        + dep_violations
    )

    if total:
        print(f"verify_evidence_and_policy failed with {total} errors")
        return 1

    print("verify_evidence_and_policy passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
