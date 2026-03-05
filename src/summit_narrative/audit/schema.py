from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class AuditEvent:
    event_id: str
    intervention_id: str
    agent_id: str
    agent_version: str
    snapshot_hash: str
    policy_decision: str
    policy_refs: list[str]
    details: dict[str, Any]
    hash_chain_prev: str | None = None
    hash_chain_self: str | None = None
