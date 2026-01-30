#!/usr/bin/env python3
import ast
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

try:
    import jsonschema
except ImportError:  # pragma: no cover - environment dependency
    jsonschema = None

ROOT = Path(__file__).resolve().parents[1]

BUNDLE_FILES = [
    "evidence/index.json",
    "evidence/tidemark-temporal-communities/report.json",
    "evidence/tidemark-temporal-communities/metrics.json",
    "evidence/tidemark-temporal-communities/stamp.json",
    "schemas/evidence/report.schema.json",
    "schemas/evidence/metrics.schema.json",
    "schemas/evidence/stamp.schema.json",
    "schemas/trajectory/community_trajectory.schema.json",
    "schemas/trajectory/community_partition.schema.json",
    "schemas/trajectory/community_transition.schema.json",
    "docs/required_checks.todo.md",
    "fixtures/temporal_graph/tiny_cascade.json",
]

TIMESTAMP_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
FORBIDDEN_KEYS = {"user_id", "handle", "email", "username"}


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _collect_keys(payload: Any, keys: list[str]) -> None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            keys.append(key)
            _collect_keys(value, keys)
    elif isinstance(payload, list):
        for item in payload:
            _collect_keys(item, keys)


def _find_timestamps(payload: Any) -> bool:
    if isinstance(payload, dict):
        for value in payload.values():
            if _find_timestamps(value):
                return True
    elif isinstance(payload, list):
        for item in payload:
            if _find_timestamps(item):
                return True
    elif isinstance(payload, str):
        return bool(TIMESTAMP_PATTERN.search(payload))
    return False


def _validate_schema(instance: dict[str, Any], schema_path: Path, errors: list[str]) -> None:
    if jsonschema is None:
        errors.append("jsonschema dependency missing; cannot validate schemas")
        return
    schema = _load_json(schema_path)
    try:
        jsonschema.validate(instance, schema)
    except jsonschema.ValidationError as exc:
        errors.append(f"Schema validation failed for {schema_path}: {exc.message}")


def _check_feature_flags(errors: list[str]) -> None:
    config_path = ROOT / "src" / "temporal_graph" / "config.py"
    if not config_path.exists():
        errors.append("Missing src/temporal_graph/config.py for feature flag defaults")
        return

    try:
        tree = ast.parse(config_path.read_text(encoding="utf-8"))
    except SyntaxError as exc:
        errors.append(f"Invalid Python in {config_path}: {exc}")
        return

    assignments = {
        node.targets[0].id: node.value
        for node in tree.body
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name)
    }
    for flag in [
        "TRAJECTORY_WRITE_ENABLED",
        "SNAPSHOT_BUILDER_ENABLED",
        "TIDE_MARK_PIPELINE_ENABLED",
        "EVAL_TEMP_COMMUNITIES",
        "RL_REFINEMENT_ENABLED",
        "INTERVENTION_SIM_ENABLED",
    ]:
        value = assignments.get(flag)
        if not isinstance(value, ast.Constant) or value.value is not False:
            errors.append(f"Feature flag {flag} must default to False")


def main() -> int:
    errors: list[str] = []

    for rel_path in BUNDLE_FILES:
        path = ROOT / rel_path
        if not path.exists():
            errors.append(f"Missing required file: {rel_path}")

    report_path = ROOT / "evidence" / "tidemark-temporal-communities" / "report.json"
    metrics_path = ROOT / "evidence" / "tidemark-temporal-communities" / "metrics.json"
    stamp_path = ROOT / "evidence" / "tidemark-temporal-communities" / "stamp.json"

    if report_path.exists():
        _validate_schema(
            _load_json(report_path),
            ROOT / "schemas" / "evidence" / "report.schema.json",
            errors,
        )
    if metrics_path.exists():
        _validate_schema(
            _load_json(metrics_path),
            ROOT / "schemas" / "evidence" / "metrics.schema.json",
            errors,
        )
    if stamp_path.exists():
        _validate_schema(
            _load_json(stamp_path),
            ROOT / "schemas" / "evidence" / "stamp.schema.json",
            errors,
        )

    for path in [report_path, metrics_path]:
        if path.exists():
            payload = _load_json(path)
            if _find_timestamps(payload):
                errors.append(f"Timestamps must only appear in stamp.json (found in {path})")

    if stamp_path.exists():
        payload = _load_json(stamp_path)
        if not _find_timestamps(payload):
            errors.append("stamp.json must include RFC3339 timestamp")

    forbidden_hits: list[str] = []
    for rel_path in [
        "evidence/tidemark-temporal-communities/report.json",
        "evidence/tidemark-temporal-communities/metrics.json",
        "fixtures/temporal_graph/tiny_cascade.json",
    ]:
        path = ROOT / rel_path
        if not path.exists():
            continue
        payload = _load_json(path)
        keys: list[str] = []
        _collect_keys(payload, keys)
        hits = FORBIDDEN_KEYS.intersection({key.lower() for key in keys})
        if hits:
            forbidden_hits.append(f"{rel_path}: {', '.join(sorted(hits))}")
    if forbidden_hits:
        errors.append("Forbidden identifier fields detected: " + "; ".join(forbidden_hits))

    _check_feature_flags(errors)

    status = "pass" if not errors else "fail"
    summary = {"status": status, "errors": errors}
    print(json.dumps(summary, indent=2))

    return 0 if status == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
