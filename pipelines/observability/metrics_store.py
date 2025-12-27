"""Lightweight shared metrics store for pipeline runs."""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class RunMetrics:
    """Structured run metrics persisted to the shared store."""

    pipeline: str
    version: str
    run_id: str
    timestamp: str
    duration_ms: Optional[int]
    succeeded: bool
    task_success_rate: float
    task_failures: int
    dry_run: bool = False
    baseline_version: Optional[str] = None
    comparisons: Dict[str, Any] = None

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        # Remove None comparisons to keep payload compact
        payload["comparisons"] = self.comparisons or {}
        return payload


class MetricsStore:
    """Simple JSON-based metrics store shared between runs."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []
        try:
            with open(self.path) as f:
                return json.load(f)
        except Exception:
            return []

    def latest_for(self, pipeline: str, version: str) -> Optional[Dict[str, Any]]:
        for record in reversed(self.load()):
            if record.get("pipeline") == pipeline and record.get("version") == version:
                return record
        return None

    def append(self, metrics: RunMetrics) -> None:
        records = self.load()
        records.append(metrics.to_dict())
        with open(self.path, "w") as f:
            json.dump(records, f, indent=2)

    @staticmethod
    def build_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()
