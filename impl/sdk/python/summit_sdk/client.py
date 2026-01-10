"""Client for Summit SDK."""

from __future__ import annotations

from typing import Any

from .model import LocalTransport, ModelHandle, ModelTransport
from .policy import PolicyContext
from .telemetry import TraceEmitter


class SummitClient:
    def __init__(
        self,
        api_key: str | None = None,
        *,
        endpoint: str | None = None,
        transport: ModelTransport | None = None,
        default_policy: PolicyContext | None = None,
    ):
        self.api_key = api_key
        self.endpoint = endpoint
        self.emitter = TraceEmitter()
        self.transport = transport or LocalTransport(self.emitter)
        self.default_policy = default_policy

    def model(
        self,
        name: str,
        *,
        policy: PolicyContext | None = None,
        transport: ModelTransport | None = None,
    ) -> ModelHandle:
        return ModelHandle(
            name=name,
            transport=transport or self.transport,
            default_policy=policy or self.default_policy,
        )

    def capabilities(self) -> dict[str, Any]:
        return {
            "transports": [self.transport.__class__.__name__],
            "features": ["tools", "rag", "policy", "telemetry"],
            "endpoint": self.endpoint,
        }

    def with_span(self, name: str, attributes: dict[str, Any] | None = None):
        span = self.emitter.span(name, attributes)

        class _SpanContext:
            def __enter__(self, *_: Any) -> None:
                return None

            def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
                status = "error" if exc else "ok"
                span.finish({"status": status})
                return False

        return _SpanContext()
