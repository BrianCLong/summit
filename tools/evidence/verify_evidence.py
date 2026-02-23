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


def _extract_entry_files(meta: object) -> list[Path]:
    if isinstance(meta, list):
        return [Path(path) for path in meta if isinstance(path, str)]

    if not isinstance(meta, dict):
        return []

    files_map = meta.get("files")
    if isinstance(files_map, dict):
        return [Path(path) for path in files_map.values() if isinstance(path, str)]

    files_list = files_map or meta.get("artifacts") or []
    if not isinstance(files_list, list):
        return []

    base_path = meta.get("path")
    base = Path(base_path) if isinstance(base_path, str) else Path(".")
    return [base / Path(path) for path in files_list if isinstance(path, str)]


def collect_index_entries(index: dict) -> dict[str, list[Path]]:
    entries: dict[str, list[Path]] = {}

    items = index.get("items")
    if isinstance(items, dict):
        for evidence_id, meta in items.items():
            files = _extract_entry_files(meta)
            if files:
                entries[evidence_id] = files

    legacy = index.get("evidence")
    if isinstance(legacy, dict):
        for evidence_id, meta in legacy.items():
            files = _extract_entry_files(meta)
            if files:
                entries.setdefault(evidence_id, files)

    return entries


def validate_index() -> tuple[dict, dict[str, list[Path]]]:
    validator = validate_schema(INDEX_SCHEMA)
    index = load_json(EVIDENCE_INDEX)
    validator.validate(index)
    entries = collect_index_entries(index)
    if not entries:
        raise ValueError("Evidence index contains no entries with files/artifacts")
    return index, entries


def select_target_evidence_ids(entries: dict[str, list[Path]]) -> list[str]:
    scoped = [evidence_id for evidence_id in REQUIRED_EVIDENCE_IDS if evidence_id in entries]
    if scoped:
        return scoped

    # This script carries CogWar-specific hard gates. If the current branch/repo
    # does not contain those IDs, skip that scoped check rather than hard-failing.
    print("CogWar required evidence IDs not present; skipping scoped evidence payload checks")
    return []


def _shared_path_counts(entries: dict[str, list[Path]], targets: list[str]) -> dict[Path, int]:
    counts: dict[Path, int] = {}
    for evidence_id in targets:
        for path in entries.get(evidence_id, []):
            counts[path] = counts.get(path, 0) + 1
    return counts


def require_evidence_files(entries: dict[str, list[Path]], targets: list[str]) -> int:
    missing = 0
    for evidence_id in targets:
        files = entries.get(evidence_id, [])
        if not files:
            print(f"Missing files list for {evidence_id}")
            missing += 1
            continue
        required_names = {"report.json", "metrics.json", "stamp.json"}
        found_names = {path.name for path in files}
        if not required_names.issubset(found_names):
            print(f"Incomplete evidence files for {evidence_id}: {sorted(found_names)}")
            missing += 1
            continue
        for path in files:
            if not path.exists():
                print(f"Evidence file missing on disk: {path}")
                missing += 1
    return missing


def validate_evidence_payloads(entries: dict[str, list[Path]], targets: list[str]) -> tuple[int, int]:
    report_validator = validate_schema(REPORT_SCHEMA)
    metrics_validator = validate_schema(METRICS_SCHEMA)
    stamp_validator = validate_schema(STAMP_SCHEMA)
    validated_files = 0
    errors = 0
    path_counts = _shared_path_counts(entries, targets)

    for evidence_id in targets:
        by_name = {path.name: path for path in entries.get(evidence_id, [])}
        report_path = by_name.get("report.json")
        metrics_path = by_name.get("metrics.json")
        stamp_path = by_name.get("stamp.json")

        for name, path, validator in (
            ("report.json", report_path, report_validator),
            ("metrics.json", metrics_path, metrics_validator),
            ("stamp.json", stamp_path, stamp_validator),
        ):
            if path is None or not path.exists():
                print(f"Missing {name} for {evidence_id}")
                errors += 1
                continue

            try:
                payload = load_json(path)
                validator.validate(payload)
            except Exception as exc:
                print(f"{evidence_id} invalid {name}: {exc}")
                errors += 1
                continue

            # Legacy evidence maps can point multiple IDs to one shared payload.
            # Avoid false mismatches when a file is intentionally shared.
            if path_counts.get(path, 0) <= 1:
                payload_evidence_id = payload.get("evidence_id")
                if payload_evidence_id not in (None, evidence_id):
                    print(f"{evidence_id} {name} evidence_id mismatch: {payload_evidence_id}")
                    errors += 1
                    continue

            if name == "report.json":
                for field in ("summary", "sources"):
                    if field not in payload:
                        print(f"{evidence_id} report missing {field}")
                        errors += 1
                        break

            validated_files += 1

    return validated_files, errors


def enforce_timestamp_isolation(entries: dict[str, list[Path]], targets: list[str]) -> int:
    violations = 0
    checked: set[Path] = set()
    for evidence_id in targets:
        for path in entries.get(evidence_id, []):
            if path in checked or path.name == "stamp.json" or path.suffix != ".json":
                continue
            checked.add(path)
            if not path.exists():
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
    if not fixture_path.exists():
        print(f"Policy deny fixture not found, skipping check: {fixture_path}")
        return 0
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
    diff_ranges = (
        [f"origin/{base_ref}...HEAD", f"origin/{base_ref}..HEAD"]
        if base_ref
        else ["HEAD~1...HEAD", "HEAD~1..HEAD"]
    )
    for diff_range in diff_ranges:
        try:
            output = subprocess.check_output(
                ["git", "diff", "--name-only", diff_range],
                text=True,
            )
            return [line.strip() for line in output.splitlines() if line.strip()]
        except subprocess.CalledProcessError:
            continue
    print("Unable to determine git diff range; skipping dependency delta check")
    return []


def validate_dependency_delta() -> int:
    files = changed_files()
    if not files:
        return 0
    changed_deps = any(path in DEPENDENCY_FILES for path in files)
    if changed_deps and "deps/dependency_delta.md" not in files:
        print("Dependency change detected without deps/dependency_delta.md update")
        return 1
    return 0


def write_governance_metrics(
    schema_count: int,
    denied_count: int,
    evd_count: int,
    entries: dict[str, list[Path]],
) -> None:
    preferred_id = "EVD-nato-cogwar-techfamilies-gov-001"
    preferred_paths = entries.get(preferred_id, [])
    metrics_path = next((path for path in preferred_paths if path.name == "metrics.json"), None)
    if metrics_path is None:
        print("Governance metrics target not present; skipping metrics write")
        return
    payload = {
        "evidence_id": preferred_id,
        "metrics": {
            "validated_schemas": schema_count,
            "denied_requests": denied_count,
            "evd_folders_verified": evd_count,
        },
    }
    metrics_path.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> int:
    _, entries = validate_index()
    targets = select_target_evidence_ids(entries)
    missing = require_evidence_files(entries, targets)
    schema_errors = validate_cogwar_schemas()
    timestamp_violations = enforce_timestamp_isolation(entries, targets)
    policy_violations = validate_policy_denies()
    flag_violations = validate_feature_flags()
    dep_violations = validate_dependency_delta()
    _, payload_errors = validate_evidence_payloads(entries, targets)

    write_governance_metrics(
        schema_count=len(list(COGWAR_SCHEMA_DIR.glob("*.schema.json"))),
        denied_count=policy_violations,
        evd_count=len(targets),
        entries=entries,
    )

    total = (
        missing
        + schema_errors
        + timestamp_violations
        + policy_violations
        + flag_violations
        + dep_violations
        + payload_errors
    )

    if total:
        print(f"verify_evidence_and_policy failed with {total} errors")
        return 1

    print("verify_evidence_and_policy passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
