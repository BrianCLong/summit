from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional

@dataclass(frozen=True)
class FinanceEvidencePaths:
    root: Path
    report: Path
    metrics: Path
    stamp: Path
    index: Path

def default_finance_paths(root: Path, evidence_id: str) -> FinanceEvidencePaths:
    evd_dir = root / evidence_id
    return FinanceEvidencePaths(
        root=evd_dir,
        report=evd_dir / "report.json",
        metrics=evd_dir / "metrics.json",
        stamp=evd_dir / "stamp.json",
        index=root / "index.json",
    )

def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Ensure consistent ordering and formatting
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def init_finance_evidence(root: Path, evidence_id: str, summary: str, run_id: Optional[str] = None) -> FinanceEvidencePaths:
    """
    Initialize finance evidence bundle.
    """
    p = default_finance_paths(root, evidence_id)

    # report.json
    write_json(p.report, {
        "evidence_id": evidence_id,
        "summary": summary,
        "artifacts": []
    })

    # metrics.json
    write_json(p.metrics, {
        "evidence_id": evidence_id,
        "metrics": {}
    })

    # stamp.json (Only place for timestamps)
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    stamp_data = {
        "evidence_id": evidence_id,
        "created_at": now
    }
    if run_id:
        stamp_data["run_id"] = run_id
    write_json(p.stamp, stamp_data)

    # Update index.json (append or create)
    index_data = {"version": "1.0", "items": {}}
    if p.index.exists():
        try:
            content = p.index.read_text(encoding="utf-8")
            if content.strip():
                index_data = json.loads(content)
        except json.JSONDecodeError:
            pass # Overwrite if corrupt

    # Relative path from index.json to evidence dir
    rel_path = str(p.root.relative_to(root))

    index_data["items"][evidence_id] = {
        "path": rel_path,
        "summary": summary
    }
    write_json(p.index, index_data)

    return p

def add_artifact(p: FinanceEvidencePaths, artifact_path: str) -> None:
    """Add an artifact to the report."""
    report = json.loads(p.report.read_text(encoding="utf-8"))
    if artifact_path not in report["artifacts"]:
        report["artifacts"].append(artifact_path)
        write_json(p.report, report)

def set_metric(p: FinanceEvidencePaths, key: str, value: Any) -> None:
    """Set a metric."""
    metrics = json.loads(p.metrics.read_text(encoding="utf-8"))
    metrics["metrics"][key] = value
    write_json(p.metrics, metrics)
