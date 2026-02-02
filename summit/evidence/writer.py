from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class EvidencePaths:
    root: Path
    report: Path
    metrics: Path
    stamp: Path
    index: Path

def default_paths(root: Path) -> EvidencePaths:
    return EvidencePaths(
        root=root,
        report=root / "report.json",
        metrics=root / "metrics.json",
        stamp=root / "stamp.json",
        index=root / "index.json",
    )

def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def init_evidence_bundle(root: Path, *, run_id: str) -> EvidencePaths:
    """
    Initialize an evidence bundle directory with required files.
    Determinism rule: timestamps must ONLY be written to stamp.json.
    """
    p = default_paths(root)

    # report.json
    write_json(p.report, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "summary": "Agent Composer Run",
        "artifacts": [],
        "run_id": run_id,
        "environment": "production",
        "backend": "unknown"
    })

    # metrics.json
    write_json(p.metrics, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "metrics": {},
        "run_id": run_id
    })

    # stamp.json
    # Use timezone-aware UTC
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    write_json(p.stamp, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "created_at": now,
        "run_id": run_id,
        "git_commit": "unknown"
    })

    # index.json
    write_json(p.index, {
        "evidence": {}
    })

    return p

def init_evidence(paths: EvidencePaths, run_id: str, item_slug: str, evidence_id: Optional[str] = None) -> None:
    """
    Initialize evidence files with deterministic structure.
    No timestamps are allowed in these files (use stamp.json for that).
    """
    eid = evidence_id or f"EVD-AGENT-{run_id}"
    write_json(paths.report, {
        "run_id": run_id,
        "evidence_id": eid,
        "summary": f"Report for {item_slug}",
        "artifacts": [],
        "environment": "production",
        "backend": "unknown"
    })
    write_json(paths.metrics, {
        "run_id": run_id,
        "metrics": {},
        "evidence_id": eid
    })
    write_json(paths.index, {
        "evidence": {}
    })
