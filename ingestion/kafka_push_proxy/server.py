"""HTTP-facing entrypoints for kafka push proxy.

Scaffold only: implementation intentionally constrained for the initial
feature-flagged landing.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PushRequest:
    """Minimal normalized payload envelope for a push request."""

    source: str
    topic: str
    payload: dict[str, Any]
    idempotency_key: str | None = None


def handle_push(request: PushRequest) -> dict[str, str]:
    """Handle a push request.

    This placeholder exists to establish module boundaries before wiring an HTTP
    framework and runtime policy/producer dependencies.
    """

    return {
        "status": "deferred",
        "reason": "kafka_push_proxy_scaffold",
        "source": request.source,
    }
