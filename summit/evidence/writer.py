from __future__ import annotations

import json
import hashlib
import os
from dataclasses import dataclass
from datetime import datetime, timezone
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
    # Requires: evidence_id, summary, artifacts
    # Optional: run_id, results
    write_json(p.report, {
        "evidence_id": f"EVD-AGENT-{run_id}", # distinct ID for the report itself
        "summary": "Agent Composer Run",
        "artifacts": [],
        "run_id": run_id,
        "results": []
    })

    # metrics.json
    # Requires: evidence_id, metrics
    # Optional: run_id, counters, timers_ms
    write_json(p.metrics, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "metrics": {},
        "run_id": run_id,
        "counters": {},
        "timers_ms": {}
    })

    # stamp.json
    # Requires: evidence_id, generated_at
    # Optional: run_id, created_at
    # Use timezone-aware UTC
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    write_json(p.stamp, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "generated_at": now,
        "run_id": run_id,
        "created_at": now
    })

    # index.json
    # Requires: run_id, evidence
    write_json(p.index, {
        "run_id": run_id,
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
        "item_slug": item_slug,
        "events": [],
        "evidence_id": eid,
        "summary": f"Report for {item_slug}",
        "item": {"id": item_slug},
        "artifacts": []
    })
    write_json(paths.metrics, {
        "run_id": run_id,
        "item_slug": item_slug,
        "metrics": {},
        "evidence_id": eid
    })
    write_json(paths.index, {
        "run_id": run_id,
        "evidence": {}
    })

def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def write_bundle(run_ctx: dict, out_dir: str) -> None:
    root = Path(out_dir)
    root.mkdir(parents=True, exist_ok=True)
    evidence_dir = root / "evidence"
    evidence_dir.mkdir(exist_ok=True)

    # Deterministic files (no timestamps here)
    report = {
        "evidence_id": run_ctx["evidence_id"],
        "run_id": run_ctx["run_id"],
        "summary": run_ctx.get("summary", ""),
        "policies_applied": run_ctx.get("policies_applied", []),
        "artifacts": run_ctx.get("artifacts", [])
    }
    metrics = run_ctx.get("metrics", {})

    # Deterministic serialization
    report_bytes = (json.dumps(report, sort_keys=True, separators=(",", ":"))).encode("utf-8")
    metrics_bytes = (json.dumps(metrics, sort_keys=True, separators=(",", ":"))).encode("utf-8")

    (root / "report.json").write_bytes(report_bytes)
    (root / "metrics.json").write_bytes(metrics_bytes)

    # Timestamps ONLY here
    stamp = {"generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
    with open(root / "stamp.json", "w", encoding="utf-8") as f:
        json.dump(stamp, f, sort_keys=True, indent=2)

    # Evidence index with hashes
    index = {
        "evidence_id": run_ctx["evidence_id"],
        "files": {
            "report.json": _sha256_bytes(report_bytes),
            "metrics.json": _sha256_bytes(metrics_bytes)
        }
    }
    with open(evidence_dir / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, sort_keys=True, indent=2)
