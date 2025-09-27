from __future__ import annotations

"""Shared data structures for source connectors."""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(slots=True)
class RecordBatch:
    """Container representing a batch of rows emitted by a source.

    Attributes
    ----------
    rows:
        Parsed CSV rows expressed as dictionaries.
    raw_bytes:
        Number of raw bytes fetched from the source to build the batch.  This
        is used to compute throughput metrics (MB/s).
    provenance:
        Metadata describing where the batch originated (object key, byte
        ranges, etc.).  The structure is intentionally flexible to accommodate
        per-source details while providing run-level provenance summaries.
    """

    rows: List[Dict[str, Any]] = field(default_factory=list)
    raw_bytes: int = 0
    provenance: Dict[str, Any] = field(default_factory=dict)

    def __len__(self) -> int:  # pragma: no cover - trivial delegation
        return len(self.rows)
