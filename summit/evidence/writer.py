from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime, timezone

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

def write_json(path: Path, obj: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")

class EvidenceWriter:
    """
    Consolidated Evidence Writer supporting both Agent Skills and Core Evidence patterns.
    """
    def __init__(self, evidence_dir: Path):
        self.evidence_dir = evidence_dir
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.evidence_dir / "index.json"

    def write_evidence(self, evd_id: str, report: dict, metrics: dict):
        evd_dir = self.evidence_dir / evd_id
        evd_dir.mkdir(exist_ok=True)

        paths = default_paths(evd_dir)

        # Write standard files
        write_json(paths.report, report)
        write_json(paths.metrics, metrics)

        # Write stamp
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        stamp = {
            "evidence_id": evd_id,
            "generated_at": now_iso,
            "timestamp": time.time(),
            "tool": "summit-evidence-writer"
        }
        write_json(paths.stamp, stamp)

        # Update index
        self._update_index(evd_id, paths)

    def _update_index(self, evd_id: str, paths: EvidencePaths):
        # Read or init index
        index_data = {"version": 1, "items": []}
        if self.index_file.exists():
            try:
                content = self.index_file.read_text()
                # Handle both legacy dict format and new array format for resilience
                loaded = json.loads(content)
                if "items" in loaded:
                    index_data = loaded
                elif "evidence" in loaded:
                    # Migration on the fly if needed, or just append to empty items
                    # For now, we assume we want strictly "items"
                    pass
            except json.JSONDecodeError:
                pass

        # Filter out existing entry for this ID
        index_data["items"] = [
            item for item in index_data["items"] 
            if item.get("evidence_id") != evd_id
        ]

        # Add new entry
        relative_report = str(paths.report.relative_to(self.evidence_dir.parent))
        relative_metrics = str(paths.metrics.relative_to(self.evidence_dir.parent))
        relative_stamp = str(paths.stamp.relative_to(self.evidence_dir.parent))

        index_data["items"].append({
            "evidence_id": evd_id,
            "report": relative_report,
            "metrics": relative_metrics,
            "stamp": relative_stamp
        })

        write_json(self.index_file, index_data)

def init_evidence_bundle(root: Path, *, run_id: str) -> EvidencePaths:
    """
    Initialize an evidence bundle directory with required files.
    Used by the legacy/script-based tooling.
    """
    p = default_paths(root)

    write_json(p.report, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "summary": "Agent Composer Run",
        "artifacts": [],
        "run_id": run_id,
        "results": []
    })

    write_json(p.metrics, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "metrics": {},
        "run_id": run_id,
        "counters": {},
        "timers_ms": {}
    })

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    write_json(p.stamp, {
        "evidence_id": f"EVD-AGENT-{run_id}",
        "generated_at": now,
        "run_id": run_id,
        "created_at": now
    })
    
    # We do NOT write a per-bundle index.json in the new pattern, 
    # but kept here for backward compatibility with older scripts if needed.
    write_json(p.index, {
        "run_id": run_id,
        "evidence": {}
    })

    return p
