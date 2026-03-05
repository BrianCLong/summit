"""Kafka producer adapter placeholders for kafka push proxy."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProduceResult:
    """Deterministic produce outcome payload."""

    accepted: bool
    reason: str


def produce_event(topic: str, payload: dict) -> ProduceResult:
    """Placeholder produce function for scaffold stage."""

    if not topic:
        return ProduceResult(accepted=False, reason="missing_topic")
    if not payload:
        return ProduceResult(accepted=False, reason="empty_payload")
    return ProduceResult(accepted=True, reason="scaffold_noop")
