from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class EvidencePaths:
    root: Path
    report: Path
    metrics: Path
    stamp: Path
    index: Path

def default_paths(root: str | Path = "evidence") -> EvidencePaths:
    root = Path(root)
    return EvidencePaths(
        root=root,
        report=root / "report.json",
        metrics=root / "metrics.json",
        stamp=root / "stamp.json",
        index=root / "index.json",
    )

def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def init_evidence(paths: EvidencePaths, run_id: str, item_slug: str) -> None:
    # Deterministic: no timestamps here.
    write_json(paths.report, {"run_id": run_id, "item_slug": item_slug, "events": []})
    write_json(paths.metrics, {"run_id": run_id, "item_slug": item_slug, "metrics": {}})
    write_json(paths.index, {"run_id": run_id, "evidence": {}})

    # Only stamp.json gets a timestamp
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    write_json(paths.stamp, {
        "run_id": run_id,
        "item_slug": item_slug,
        "generated_at": now
    })
