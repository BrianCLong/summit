#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

SCHEMA_PATH = Path("governance/schema/governance.schema.json")
EVIDENCE_ID_PATTERN = re.compile(r"^SUMMIT-GOV-[a-z0-9-]+-\d{3}$")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Missing JSON file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON in {path}: {exc}")
    if not isinstance(payload, dict):
        fail(f"JSON root must be an object: {path}")
    return payload


def _sort_strings(values: list[str]) -> list[str]:
    return sorted(values, key=lambda value: [ord(char) for char in value] + [len(value)])


def _normalize(value: Any) -> Any:
    if isinstance(value, dict):
        keys = sorted(value.keys(), key=lambda item: [ord(char) for char in item] + [len(item)])
        return {key: _normalize(value[key]) for key in keys}
    if isinstance(value, list):
        normalized_items = [_normalize(item) for item in value]
        # Sort lists deterministically by canonical representation.
        return sorted(normalized_items, key=lambda item: json.dumps(item, sort_keys=True, separators=(",", ":")))
    return value


def dump_deterministic(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = _normalize(payload)
    path.write_text(json.dumps(normalized, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def validate_schema(spec: dict[str, Any], schema_path: Path) -> None:
    schema = load_json(schema_path)
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError:
        return

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(spec), key=lambda err: list(err.path))
    if errors:
        details = "; ".join(error.message for error in errors)
        fail(f"Schema validation failed: {details}")


def validate_spec(
    spec: dict[str, Any],
    slug: str,
    repo_root: Path,
    schema_path: Path,
) -> None:
    if not SLUG_PATTERN.fullmatch(slug):
        fail(f"Invalid slug '{slug}'. Use lowercase letters, numbers, and hyphens only.")

    validate_schema(spec, schema_path)

    if "item_slug" in spec and spec["item_slug"] != slug:
        fail("item_slug in spec must match --item-slug")

    classification = spec.get("data_classification")
    if not isinstance(classification, dict) or not classification:
        fail("Spec must include non-empty data_classification object")

    threats = spec.get("threat_model")
    if not isinstance(threats, list) or len(threats) == 0:
        fail("Spec must include non-empty threat_model array")

    abuse_fixtures = spec.get("abuse_case_fixtures")
    if not isinstance(abuse_fixtures, list) or len(abuse_fixtures) == 0:
        fail("Spec must include non-empty abuse_case_fixtures array")

    for index, entry in enumerate(threats, start=1):
        if not isinstance(entry, dict):
            fail(f"threat_model[{index}] must be an object")
        for field in ("id", "threat", "mitigation", "ci_gate", "test_fixture"):
            if not entry.get(field):
                fail(f"threat_model[{index}] missing '{field}'")

    for fixture in abuse_fixtures:
        fixture_path = repo_root / fixture
        if not fixture_path.exists():
            fail(f"abuse_case_fixture does not exist: {fixture}")


def build_evidence_ids(slug: str, count: int) -> list[str]:
    evidence_ids = [f"SUMMIT-GOV-{slug}-{index:03d}" for index in range(1, count + 1)]
    for evidence_id in evidence_ids:
        if not EVIDENCE_ID_PATTERN.fullmatch(evidence_id):
            fail(f"Generated invalid evidence ID: {evidence_id}")
    return evidence_ids


def build_report(spec: dict[str, Any], slug: str, evidence_ids: list[str]) -> dict[str, Any]:
    threats = spec["threat_model"]
    return {
        "item_slug": slug,
        "title": spec["title"],
        "service_description": spec["service_description"],
        "claim_registry": spec.get("claim_registry", []),
        "data_classification": spec["data_classification"],
        "threat_model": threats,
        "abuse_case_fixtures": spec["abuse_case_fixtures"],
        "controls": spec.get("controls", []),
        "maestro_layers": spec.get("maestro_layers", []),
        "evidence_ids": evidence_ids,
        "determinism": {
            "timestamps_in_report": False,
            "timestamps_in_metrics": False,
            "stable_key_order": True,
        },
    }


def build_metrics(spec: dict[str, Any], slug: str, evidence_ids: list[str]) -> dict[str, Any]:
    threats = spec["threat_model"]
    fixtures = spec["abuse_case_fixtures"]
    controls = spec.get("controls", [])
    return {
        "item_slug": slug,
        "evidence_id": evidence_ids[1],
        "counts": {
            "abuse_case_fixtures": len(fixtures),
            "controls": len(controls),
            "threat_model_entries": len(threats),
        },
        "gates": _sort_strings([entry["ci_gate"] for entry in threats]),
        "performance_budget": {
            "max_memory_mb": 50,
            "max_runtime_ms": 200,
        },
    }


def _spec_hash(spec: dict[str, Any]) -> str:
    canonical = json.dumps(_normalize(spec), separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _schema_reference(schema_path: Path, repo_root: Path) -> str:
    try:
        return schema_path.relative_to(repo_root).as_posix()
    except ValueError:
        return schema_path.as_posix()


def build_stamp(
    spec: dict[str, Any],
    slug: str,
    evidence_ids: list[str],
    schema_path: Path,
    repo_root: Path,
) -> dict[str, Any]:
    return {
        "item_slug": slug,
        "evidence_id": evidence_ids[2],
        "generator": "scripts/governance/generate_pack.py",
        "schema_path": _schema_reference(schema_path, repo_root),
        "schema_version": "1.0.0",
        "source_spec_sha256": _spec_hash(spec),
    }


def write_supporting_docs(spec: dict[str, Any], slug: str, output_root: Path) -> None:
    classification = spec["data_classification"]
    pii_categories = classification.get("pii_categories", [])
    retention = classification.get("retention_policy", "Deferred pending policy assignment")
    never_log = classification.get("never_log", [])
    redaction = classification.get("redaction_rules", [])
    storage = classification.get("storage_classification", "INTERNAL")

    data_handling_path = output_root / "docs/security/data-handling" / f"{slug}.md"
    runbook_path = output_root / "docs/ops/runbooks" / f"{slug}.md"
    standards_path = output_root / "docs/standards" / f"{slug}.md"

    data_handling = "\n".join(
        [
            f"# Data Handling: {slug}",
            "",
            "## PII Categories",
            *[f"- {item}" for item in pii_categories],
            "",
            "## Retention Policy",
            f"- {retention}",
            "",
            "## Never-Log List",
            *[f"- {item}" for item in never_log],
            "",
            "## Redaction Rules",
            *[f"- {item}" for item in redaction],
            "",
            "## Storage Classification",
            f"- {storage}",
            "",
        ]
    )

    runbook = "\n".join(
        [
            f"# Runbook: {slug}",
            "",
            "## Trigger",
            "- governance-pack-check fails or drift detector reports policy removal.",
            "",
            "## Immediate Actions",
            "- Triage failing gate and identify missing section (classification/threat/abuse fixtures).",
            "- Regenerate artifacts with `scripts/governance/generate_pack.py`.",
            "- Re-run governance checks before merge.",
            "",
            "## Rollback",
            "- Set feature flag `GOVERNANCE_PACK_ENFORCEMENT=false` if emergency bypass is approved.",
            "",
        ]
    )

    threats = spec["threat_model"]
    standards = "\n".join(
        [
            f"# Standard: {slug}",
            "",
            "## MAESTRO Layers",
            *[f"- {layer}" for layer in spec.get("maestro_layers", [])],
            "",
            "## Threats Considered",
            *[f"- {entry['threat']}" for entry in threats],
            "",
            "## Mitigations",
            *[f"- {entry['mitigation']}" for entry in threats],
            "",
            "## Interop",
            "- Input: service description, threat model YAML, data classification JSON.",
            "- Output: governance report.json, metrics.json, stamp.json.",
            "",
            "## Performance Budget",
            "- Runtime budget: median generation time must remain below 200ms.",
            "- Memory budget: peak memory must remain below 50MB.",
            "- Profiler: `scripts/perf/profile_governance.py`.",
            f"- Artifact: `governance/{slug}/perf.json`.",
            "",
        ]
    )

    data_handling_path.parent.mkdir(parents=True, exist_ok=True)
    runbook_path.parent.mkdir(parents=True, exist_ok=True)
    standards_path.parent.mkdir(parents=True, exist_ok=True)

    data_handling_path.write_text(data_handling, encoding="utf-8")
    runbook_path.write_text(runbook, encoding="utf-8")
    standards_path.write_text(standards, encoding="utf-8")


def write_drift_script(slug: str, output_root: Path) -> None:
    script_path = output_root / "scripts/monitoring" / f"{slug}-drift.py"
    content = f"""#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK_DIR = ROOT / "governance" / "{slug}"
REPORT_PATH = PACK_DIR / "report.json"
METRICS_PATH = PACK_DIR / "metrics.json"
STAMP_PATH = PACK_DIR / "stamp.json"


def digest(path: Path) -> str:
    payload = path.read_bytes()
    return hashlib.sha256(payload).hexdigest()


def bundle_hash(report_hash: str, metrics_hash: str, stamp_hash: str) -> str:
    return hashlib.sha256(f"{{report_hash}}{{metrics_hash}}{{stamp_hash}}".encode("utf-8")).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Drift detector for {slug} governance pack.")
    parser.add_argument("--previous-hash", default=os.getenv("PREVIOUS_GOV_HASH", ""))
    parser.add_argument("--fail-on-drift", action="store_true")
    parser.add_argument("--out", type=Path, default=None, help="Optional output JSON file path")
    return parser.parse_args()


def validate_policy_shape(report: dict) -> list[str]:
    issues: list[str] = []
    data_classification = report.get("data_classification")
    threat_model = report.get("threat_model")
    abuse_fixtures = report.get("abuse_case_fixtures")

    if not isinstance(data_classification, dict) or not data_classification:
        issues.append("missing-data-classification")
    if not isinstance(threat_model, list) or len(threat_model) == 0:
        issues.append("missing-threat-model")
    if not isinstance(abuse_fixtures, list) or len(abuse_fixtures) == 0:
        issues.append("missing-abuse-case-fixtures")
    return issues


def main() -> int:
    args = parse_args()
    if not REPORT_PATH.exists() or not METRICS_PATH.exists() or not STAMP_PATH.exists():
        print("FAIL: governance pack missing required files")
        return 1

    report_payload = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    issues = validate_policy_shape(report_payload)

    report_hash = digest(REPORT_PATH)
    metrics_hash = digest(METRICS_PATH)
    stamp_hash = digest(STAMP_PATH)
    current_hash = bundle_hash(report_hash, metrics_hash, stamp_hash)

    drift_reasons = list(issues)
    if args.previous_hash and args.previous_hash != current_hash:
        drift_reasons.append("bundle-hash-changed")
    drift_detected = len(drift_reasons) > 0

    result = {{
        "item_slug": "{slug}",
        "current_hash": current_hash,
        "previous_hash": args.previous_hash or None,
        "report_sha256": report_hash,
        "metrics_sha256": metrics_hash,
        "stamp_sha256": stamp_hash,
        "drift_detected": drift_detected,
        "drift_reasons": sorted(drift_reasons),
    }}

    serialized = json.dumps(result, indent=2, sort_keys=True)
    print(serialized)
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(serialized + "\\n", encoding="utf-8")

    if args.fail_on_drift and drift_detected:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
"""
    script_path.parent.mkdir(parents=True, exist_ok=True)
    script_path.write_text(content, encoding="utf-8")
    script_path.chmod(0o755)


def generate_pack(
    *,
    spec_path: Path,
    slug: str,
    output_root: Path,
    repo_root: Path,
    schema_path: Path,
    emit_supporting_artifacts: bool,
) -> tuple[Path, Path, Path]:
    spec = load_json(spec_path)
    validate_spec(spec, slug, repo_root, schema_path)

    evidence_ids = build_evidence_ids(slug, 3)
    report = build_report(spec, slug, evidence_ids)
    metrics = build_metrics(spec, slug, evidence_ids)
    stamp = build_stamp(spec, slug, evidence_ids, schema_path, repo_root)

    pack_dir = output_root / "governance" / slug
    report_path = pack_dir / "report.json"
    metrics_path = pack_dir / "metrics.json"
    stamp_path = pack_dir / "stamp.json"

    dump_deterministic(report_path, report)
    dump_deterministic(metrics_path, metrics)
    dump_deterministic(stamp_path, stamp)

    if emit_supporting_artifacts:
        write_supporting_docs(spec, slug, output_root)
        write_drift_script(slug, output_root)

    return report_path, metrics_path, stamp_path


def validate_repo_specs(repo_root: Path, schema_path: Path) -> int:
    spec_paths = sorted((repo_root / "governance").glob("*/input.spec.json"))
    if not spec_paths:
        fail("No governance specs found at governance/*/input.spec.json")

    for spec_path in spec_paths:
        slug = spec_path.parent.name
        spec = load_json(spec_path)
        validate_spec(spec, slug, repo_root, schema_path)

    print(f"Validated {len(spec_paths)} governance spec(s)")
    return 0


def verify_repo_artifacts(repo_root: Path, schema_path: Path) -> int:
    spec_paths = sorted((repo_root / "governance").glob("*/input.spec.json"))
    if not spec_paths:
        fail("No governance specs found at governance/*/input.spec.json")

    checked = 0
    with tempfile.TemporaryDirectory(prefix="governance-pack-verify-") as temp_dir:
        temp_root = Path(temp_dir)
        for spec_path in spec_paths:
            slug = spec_path.parent.name
            generate_pack(
                spec_path=spec_path,
                slug=slug,
                output_root=temp_root,
                repo_root=repo_root,
                schema_path=schema_path,
                emit_supporting_artifacts=True,
            )

            relative_paths = [
                Path("governance") / slug / "report.json",
                Path("governance") / slug / "metrics.json",
                Path("governance") / slug / "stamp.json",
                Path("docs/security/data-handling") / f"{slug}.md",
                Path("docs/ops/runbooks") / f"{slug}.md",
                Path("docs/standards") / f"{slug}.md",
                Path("scripts/monitoring") / f"{slug}-drift.py",
            ]

            for relative_path in relative_paths:
                expected_path = temp_root / relative_path
                actual_path = repo_root / relative_path
                if not actual_path.exists():
                    fail(f"Missing generated artifact in repository: {relative_path}")
                if expected_path.read_text(encoding="utf-8") != actual_path.read_text(encoding="utf-8"):
                    fail(f"Stale generated artifact: {relative_path}")
            checked += 1

    print(f"Verified {checked} governance pack artifact set(s)")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate deterministic Summit governance packs.")
    parser.add_argument("--spec", type=Path, help="Path to governance spec JSON")
    parser.add_argument("--item-slug", help="Stable item slug")
    parser.add_argument("--repo-root", type=Path, default=Path("."), help="Repository root")
    parser.add_argument("--output-root", type=Path, default=Path("."), help="Output root")
    parser.add_argument("--schema", type=Path, default=SCHEMA_PATH, help="Governance schema path")
    parser.add_argument("--validate-repo", action="store_true", help="Validate governance/*/input.spec.json")
    parser.add_argument(
        "--verify-repo",
        action="store_true",
        help="Validate specs and verify generated artifacts are up to date",
    )
    parser.add_argument(
        "--no-supporting-artifacts",
        action="store_true",
        help="Skip docs and drift script generation",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    repo_root = args.repo_root.resolve()
    schema_path = (repo_root / args.schema).resolve() if not args.schema.is_absolute() else args.schema

    if args.validate_repo:
        return validate_repo_specs(repo_root, schema_path)
    if args.verify_repo:
        return verify_repo_artifacts(repo_root, schema_path)

    if not args.spec or not args.item_slug:
        fail("--spec and --item-slug are required unless --validate-repo or --verify-repo is used")

    spec_path = (repo_root / args.spec).resolve() if not args.spec.is_absolute() else args.spec
    output_root = (repo_root / args.output_root).resolve() if not args.output_root.is_absolute() else args.output_root

    report_path, metrics_path, stamp_path = generate_pack(
        spec_path=spec_path,
        slug=args.item_slug,
        output_root=output_root,
        repo_root=repo_root,
        schema_path=schema_path,
        emit_supporting_artifacts=not args.no_supporting_artifacts,
    )
    print("Generated governance pack artifacts:")
    print(report_path)
    print(metrics_path)
    print(stamp_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
