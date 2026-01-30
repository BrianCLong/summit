#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


ISO_TS_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")

SCHEMA_PATHS = {
    "report": "evidence/schemas/report.schema.json",
    "metrics": "evidence/schemas/metrics.schema.json",
    "stamp": "evidence/schemas/stamp.schema.json",
    "index": "evidence/schemas/index.schema.json",
}

GOVERNED_SCHEMA_EXCEPTIONS = {
    "evidence/report.json",
    "evidence/metrics.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-SEC-001/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-ARCH-001/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-GOV-002/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-PROD-001/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-SEC-002/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-GOV-001/report.json",
    "evidence/graph-hybrid/EVD-GRAPH-HYBRID-PERF-001/report.json",
    "evidence/runs/subsumption-bundle-verify/report.json",
    "evidence/runs/initial/report.json",
    "evidence/runs/subsumption-verify/report.json",
    "evidence/moltworker/report.json",
    "evidence/project19/report.json",
    "evidence/subsumption/ssdf-v1-2/verifier/report.json",
    "evidence/subsumption/ssdf-v1-2/report.json",
    "evidence/subsumption/claim-level-graphrag/EVD-CLGRAG-CI-001/report.json",
    "evidence/azure-turin-v7/verifier/report.json",
    "evidence/azure-turin-v7/pr-01/report.json",
    "evidence/item-unknown/report.json",
    "evidence/templates/report.json",
    "evidence/EVD-UPWIND_RUNTIMEFIRST-FOUNDATION-001/report.json",
    "evidence/mcp-apps/report.json",
    "evidence/packs/EVD-PPGI-MAG-PRIV-001/report.json",
}

GOVERNED_TIMESTAMP_EXCEPTIONS = {
    "evidence/governance/agent_governance.report.json",
    "evidence/project19/alignment.report.json",
    "evidence/project19/report.json",
    "evidence/jules/preflight.report.json",
}


class EvidenceError(Exception):
    pass


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def iter_json_files(root: Path) -> list[Path]:
    return [path for path in root.rglob("*.json") if path.is_file()]


def contains_timestamp(payload: str) -> bool:
    return ISO_TS_PATTERN.search(payload) is not None


def has_download_links(value: object) -> bool:
    if isinstance(value, dict):
        if "download_links" in value:
            return True
        return any(has_download_links(v) for v in value.values())
    if isinstance(value, list):
        return any(has_download_links(v) for v in value)
    return False


def validate_index(root: Path) -> None:
    index_path = root / "evidence/index.json"
    schema_path = root / SCHEMA_PATHS["index"]
    index_payload = load_json(index_path)
    schema_payload = load_json(schema_path)
    from jsonschema import Draft202012Validator

    Draft202012Validator(schema_payload).validate(index_payload)


def validate_reports_and_metrics(root: Path) -> None:
    from jsonschema import Draft202012Validator

    report_schema = load_json(root / SCHEMA_PATHS["report"])
    metrics_schema = load_json(root / SCHEMA_PATHS["metrics"])
    report_validator = Draft202012Validator(report_schema)
    metrics_validator = Draft202012Validator(metrics_schema)

    for path in iter_json_files(root / "evidence"):
        rel_path = str(path)
        if rel_path in GOVERNED_SCHEMA_EXCEPTIONS:
            continue
        if path.name == "report.json":
            report_validator.validate(load_json(path))
        if path.name == "metrics.json":
            metrics_validator.validate(load_json(path))


def verify_timestamps(root: Path) -> None:
    for path in iter_json_files(root / "evidence"):
        rel_path = str(path)
        if path.name == "stamp.json" or rel_path in GOVERNED_TIMESTAMP_EXCEPTIONS:
            continue
        if contains_timestamp(path.read_text(encoding="utf-8")):
            raise EvidenceError(
                f"gate:no-timestamps-outside-stamp: {rel_path}"
            )


def verify_no_download_links(root: Path) -> None:
    for path in iter_json_files(root / "evidence"):
        payload = load_json(path)
        if has_download_links(payload):
            raise EvidenceError(f"gate:no-signed-urls: {path}")


def verify_connector_disabled_by_default() -> None:
    from connectors.github.copilot_metrics.config import CopilotMetricsConfig

    if CopilotMetricsConfig().enabled is not False:
        raise EvidenceError("gate:copilot-metrics-deny-by-default")


def main() -> int:
    root = Path(".")
    try:
        validate_index(root)
        validate_reports_and_metrics(root)
        verify_timestamps(root)
        verify_no_download_links(root)
        verify_connector_disabled_by_default()
    except EvidenceError as exc:
        print(str(exc))
        return 2
    except Exception as exc:
        print(f"gate:evidence-schema: {exc}")
        return 1
    print("gate:evidence-schema: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
