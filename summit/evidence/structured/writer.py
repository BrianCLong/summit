"""Deterministic evidence writer for structured retrieval."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


@dataclass(frozen=True)
class StructuredEvidencePaths:
    root: Path
    evidence: Path
    query_plan: Path
    metrics: Path
    stamp: Path


@dataclass(frozen=True)
class StructuredEvidenceWriter:
    root: Path

    def paths(self) -> StructuredEvidencePaths:
        return StructuredEvidencePaths(
            root=self.root,
            evidence=self.root / "evidence.json",
            query_plan=self.root / "query_plan.json",
            metrics=self.root / "metrics.json",
            stamp=self.root / "stamp.json",
        )

    def write(
        self,
        *,
        run_id: str,
        item_slug: str,
        query_plan: dict[str, Any],
        metrics: dict[str, Any],
        evidence: dict[str, Any],
    ) -> StructuredEvidencePaths:
        paths = self.paths()
        _write_json(
            paths.evidence,
            {
                "run_id": run_id,
                "item_slug": item_slug,
                "evidence": evidence,
            },
        )
        _write_json(paths.query_plan, query_plan)
        _write_json(paths.metrics, metrics)

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        _write_json(paths.stamp, {"generated_at": now, "run_id": run_id})
        return paths
