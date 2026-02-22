from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class DecisionPacket:
    packet_id: str
    workflow_id: str
    node_id: str
    inputs_ref: str
    model_output_ref: str
    policy_results: dict[str, Any]
    recommended_action: str
    payload: dict[str, Any]
    reviewer: Optional[str] = None
    disposition: Optional[str] = None # APPROVED, DENIED
    rationale: Optional[str] = None
    redaction_map: dict[str, str] = field(default_factory=dict)

    @staticmethod
    def create(workflow_id: str, node_id: str, payload: dict[str, Any], recommended_action: str) -> DecisionPacket:
        # Deterministic ID generation
        content = json.dumps({
            "workflow_id": workflow_id,
            "node_id": node_id,
            "payload": payload,
            "recommended_action": recommended_action
        }, sort_keys=True)
        packet_id = hashlib.sha256(content.encode("utf-8")).hexdigest()

        return DecisionPacket(
            packet_id=packet_id,
            workflow_id=workflow_id,
            node_id=node_id,
            inputs_ref="ref_hash_placeholder",
            model_output_ref="ref_hash_placeholder",
            policy_results={},
            recommended_action=recommended_action,
            payload=payload
        )
