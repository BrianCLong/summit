"""Telemetry emission utilities."""
from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class Span:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    component: str
    attributes: Dict[str, Any]
    start_time: float

    def finish(self, attributes: Optional[Dict[str, Any]] = None) -> None:
        payload = {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "component": self.component,
            "attributes": {**self.attributes, **(attributes or {})},
            "timestamp": time.time(),
            "duration_ms": round((time.time() - self.start_time) * 1000, 3),
        }
        print(json.dumps(payload))


class TraceEmitter:
    def __init__(self, trace_id: Optional[str] = None):
        self.trace_id = trace_id or str(uuid.uuid4())

    def span(self, component: str, attributes: Optional[Dict[str, Any]] = None, parent_span_id: Optional[str] = None) -> Span:
        span_id = str(uuid.uuid4())
        return Span(
            trace_id=self.trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            component=component,
            attributes=attributes or {},
            start_time=time.time(),
        )

