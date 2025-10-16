"""Utilities for writing decision data to the provenance ledger."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ProvenanceRecord:
    decision_id: str
    case_id: str
    action: str
    reward: float
    reward_components: dict[str, float]
    model_hash: str
    state_hash: str


class ProvenanceLogger:
    """Simple append-only logger; production uses Prov-Ledger service."""

    def __init__(self, publisher) -> None:
        self._publisher = publisher

    async def record(self, record: ProvenanceRecord) -> None:
        await self._publisher.publish(record)
