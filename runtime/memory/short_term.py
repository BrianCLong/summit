"""Deterministic short-term conversational memory."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Dict, List

from .base_memory import BaseMemory, MemoryEntry, MemorySnapshot


class ShortTermMemory(BaseMemory):
    """Windowed in-memory buffer with deterministic snapshotting."""

    def __init__(self, window_size: int = 10) -> None:
        if window_size <= 0:
            raise ValueError("window_size must be > 0")
        self.window_size = window_size
        self._buffer: List[MemoryEntry] = []

    def add(self, role: str, content: str) -> None:
        entry: MemoryEntry = {"role": role, "content": content}
        self._buffer.append(entry)
        if len(self._buffer) > self.window_size:
            self._buffer = self._buffer[-self.window_size :]

    def entries(self) -> List[MemoryEntry]:
        return [dict(item) for item in self._buffer]

    def snapshot(self) -> MemorySnapshot:
        return {
            "kind": "short_term",
            "window_size": self.window_size,
            "entry_count": len(self._buffer),
            "entries": self.entries(),
        }


def _compute_evidence_id(memory_snapshot: MemorySnapshot) -> str:
    snapshot_bytes = json.dumps(memory_snapshot, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )
    digest = hashlib.sha256(snapshot_bytes).hexdigest()
    return f"memory-short-term-{digest[:12]}"


def write_memory_artifacts(
    memory: BaseMemory,
    artifact_dir: str | Path = "artifacts",
) -> Dict[str, str]:
    """Write deterministic memory artifacts used by CI evidence gates."""

    directory = Path(artifact_dir)
    directory.mkdir(parents=True, exist_ok=True)

    snapshot = memory.snapshot()
    evidence_id = _compute_evidence_id(snapshot)

    memory_report_path = directory / "memory_report.json"
    evidence_path = directory / "evidence.json"

    memory_report = {
        "memory": snapshot,
        "evidence_id": evidence_id,
        "schema_version": "1.0.0",
    }
    evidence = {
        "kind": "memory_evidence",
        "evidence_id": evidence_id,
        "artifacts": ["memory_report.json"],
    }

    memory_report_path.write_text(json.dumps(memory_report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    evidence_path.write_text(json.dumps(evidence, sort_keys=True, indent=2) + "\n", encoding="utf-8")

    return {
        "memory_report": str(memory_report_path),
        "evidence": str(evidence_path),
        "evidence_id": evidence_id,
    }
