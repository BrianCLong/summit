from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from ingestion.utils import compute_hash

from .base import Ingestor


class JSONLIngestor(Ingestor):
    """Ingest records from local JSONL files."""

    def __init__(self, producer: Any, topic: str, files: Iterable[str]):
        super().__init__(producer, topic)
        self.files = [Path(path) for path in files]

    def fetch(self) -> Iterable[dict[str, Any]]:
        for file_path in self.files:
            if not file_path.exists():
                continue
            with file_path.open(encoding="utf-8") as handle:
                for line in handle:
                    cleaned = line.strip()
                    if not cleaned:
                        continue
                    record = json.loads(cleaned)
                    if isinstance(record, dict):
                        yield record

    def normalize(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item.get("id") or compute_hash(item),
            "platform": "jsonl",
            "timestamp": item.get("timestamp") or item.get("created_at"),
            "text": item.get("text") or item.get("message") or "",
            "metadata": {
                "source": item.get("source"),
                "path": item.get("path"),
            },
            "raw": item,
        }
