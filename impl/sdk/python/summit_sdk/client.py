"""Client for Summit SDK."""
from __future__ import annotations

from typing import Any, Dict, Optional

from .model import LocalTransport, ModelHandle, ModelTransport
from .policy import PolicyContext
from .telemetry import TraceEmitter


class SummitClient:
    def __init__(self, api_key: Optional[str] = None, *, endpoint: Optional[str] = None, transport: Optional[ModelTransport] = None, default_policy: Optional[PolicyContext] = None):
        self.api_key = api_key
        self.endpoint = endpoint
        self.emitter = TraceEmitter()
        self.transport = transport or LocalTransport(self.emitter)
        self.default_policy = default_policy

    def model(self, name: str, *, policy: Optional[PolicyContext] = None, transport: Optional[ModelTransport] = None) -> ModelHandle:
        return ModelHandle(name=name, transport=transport or self.transport, default_policy=policy or self.default_policy)

    def capabilities(self) -> Dict[str, Any]:
        return {
            "transports": [self.transport.__class__.__name__],
            "features": ["tools", "rag", "policy", "telemetry"],
            "endpoint": self.endpoint,
        }

    def with_span(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        span = self.emitter.span(name, attributes)

        class _SpanContext:
            def __enter__(self, *_: Any) -> None:
                return None

            def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
                status = "error" if exc else "ok"
                span.finish({"status": status})
                return False

        return _SpanContext()

