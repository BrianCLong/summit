from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class RuntimeSignal:
    ts: str                # ISO8601 string; parsed at edges
    source: str            # e.g., "mock", "otel", "cloudtrail"
    workload_id: str       # opaque id
    event_type: str        # e.g., "process_start"
    attrs: Mapping[str, Any]
