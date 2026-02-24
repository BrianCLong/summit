from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _write_sorted_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def emit_mcp_evidence(
    *,
    output_dir: str,
    run_id: str,
    git_commit: str,
    adapter_result: dict[str, Any],
    created_at: str | None = None,
) -> dict[str, str]:
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)

    evidence_id = adapter_result.get("evidence_id", "EVIDENCE:MCP:GCP:UNKNOWN:UNKNOWN")

    report = {
        "evidence_id": evidence_id,
        "summary": "GCP managed MCP probe",
        "environment": "gcp-mcp-cleanroom",
        "backend": "gcp-managed-mcp-adapter",
        "artifacts": ["metrics.json", "stamp.json"],
        "status": adapter_result.get("status", "unknown"),
        "project_id": adapter_result.get("project_id", "unknown"),
        "tool_name": adapter_result.get("tool_name", "unknown"),
        "mode": adapter_result.get("mode", "managed"),
    }

    metrics = {
        "evidence_id": evidence_id,
        "metrics": {
            "denied": adapter_result.get("status") != "ok",
            "row_count": int(adapter_result.get("row_count", 0)),
            "max_rows": int(adapter_result.get("policy", {}).get("max_rows", 0)),
        },
    }

    stamp = {
        "created_at": created_at or datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "git_commit": git_commit,
        "run_id": run_id,
        "evidence_id": evidence_id,
    }

    report_path = root / "report.json"
    metrics_path = root / "metrics.json"
    stamp_path = root / "stamp.json"

    _write_sorted_json(report_path, report)
    _write_sorted_json(metrics_path, metrics)
    _write_sorted_json(stamp_path, stamp)

    return {
        "report": str(report_path),
        "metrics": str(metrics_path),
        "stamp": str(stamp_path),
    }
