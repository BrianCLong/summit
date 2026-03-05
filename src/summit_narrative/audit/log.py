from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Iterable, List

from .schema import AuditEvent


def _canonical_event_payload(event: AuditEvent) -> str:
    payload = {
        "event_id": event.event_id,
        "intervention_id": event.intervention_id,
        "agent_id": event.agent_id,
        "agent_version": event.agent_version,
        "snapshot_hash": event.snapshot_hash,
        "policy_decision": event.policy_decision,
        "policy_refs": event.policy_refs,
        "details": event.details,
        "hash_chain_prev": event.hash_chain_prev,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def _hash_event(event: AuditEvent) -> str:
    return hashlib.sha256(_canonical_event_payload(event).encode("utf-8")).hexdigest()


@dataclass
class AuditLog:
    innovation_enabled: bool = False
    events: list[AuditEvent] = field(default_factory=list)

    def append(self, event: AuditEvent) -> AuditEvent:
        if self.innovation_enabled:
            prev_hash = self.events[-1].hash_chain_self if self.events else None
            event = AuditEvent(
                event_id=event.event_id,
                intervention_id=event.intervention_id,
                agent_id=event.agent_id,
                agent_version=event.agent_version,
                snapshot_hash=event.snapshot_hash,
                policy_decision=event.policy_decision,
                policy_refs=event.policy_refs,
                details=event.details,
                hash_chain_prev=prev_hash,
                hash_chain_self=None,
            )
            event_hash = _hash_event(event)
            event = AuditEvent(
                event_id=event.event_id,
                intervention_id=event.intervention_id,
                agent_id=event.agent_id,
                agent_version=event.agent_version,
                snapshot_hash=event.snapshot_hash,
                policy_decision=event.policy_decision,
                policy_refs=event.policy_refs,
                details=event.details,
                hash_chain_prev=prev_hash,
                hash_chain_self=event_hash,
            )
        self.events.append(event)
        return event

    def by_intervention_id(self, intervention_id: str) -> list[AuditEvent]:
        return [event for event in self.events if event.intervention_id == intervention_id]

    def verify_chain(self) -> bool:
        if not self.innovation_enabled:
            return True
        for index, event in enumerate(self.events):
            expected_prev = self.events[index - 1].hash_chain_self if index > 0 else None
            if event.hash_chain_prev != expected_prev:
                return False
            if event.hash_chain_self != _hash_event(event):
                return False
        return True
