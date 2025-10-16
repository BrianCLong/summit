"""OPA/Policy engine client wrappers."""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import httpx


@dataclass(slots=True)
class PolicyDecision:
    """Represents a policy evaluation result for a specific action."""

    action_id: str
    allowed: bool
    constraints: Sequence[str]


class PolicyClient:
    """Lightweight OPA client used to enforce guardrails."""

    def __init__(self, endpoint: str, timeout_seconds: int = 5) -> None:
        self._endpoint = endpoint.rstrip("/")
        self._timeout = timeout_seconds

    async def allowed_actions(self, case_id: str, candidates: Iterable[str]) -> list[str]:
        """Return the actions permitted for the given case ID."""

        payload = {"input": {"case_id": case_id, "actions": list(candidates)}}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(self._endpoint + "/allowed", json=payload)
            response.raise_for_status()
            data = response.json()
        return data.get("result", [])

    async def explain_block(self, case_id: str, action_id: str) -> PolicyDecision:
        """Fetch a detailed policy explanation for a blocked action."""

        payload = {"input": {"case_id": case_id, "action": action_id}}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(self._endpoint + "/explain", json=payload)
            response.raise_for_status()
            data = response.json()
        return PolicyDecision(
            action_id=action_id,
            allowed=data.get("result", {}).get("allowed", False),
            constraints=data.get("result", {}).get("constraints", []),
        )

    async def record_decision(
        self,
        decision_id: str,
        *,
        case_id: str,
        action: str,
        state_hash: str,
        reward: float,
        constraints: Sequence[str],
    ) -> None:
        """Post decision metadata for auditing."""

        payload = {
            "decision_id": decision_id,
            "case_id": case_id,
            "action": action,
            "state_hash": state_hash,
            "reward": reward,
            "constraints": list(constraints),
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(self._endpoint + "/decision", json=payload)
            response.raise_for_status()

    @staticmethod
    def mask_actions(
        candidate_actions: Sequence[str], allowed_actions: Sequence[str]
    ) -> list[bool]:
        """Compute a boolean mask representing policy-approved actions."""

        allowed_set = set(allowed_actions)
        return [action in allowed_set for action in candidate_actions]

    @staticmethod
    def state_fingerprint(state: Sequence[float]) -> str:
        """Generate a deterministic hash for provenance ledgers."""

        # JSON dumps with sorted keys gives us a consistent representation.
        encoded = json.dumps(list(state), sort_keys=True)
        return str(abs(hash(encoded)))
