"""Leak budget policies for SCBA."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Mapping, Optional


@dataclass
class LeakBudget:
    """Thresholds for the different side-channel categories."""

    latency_ms: float
    payload_bytes: float
    cache_hint: float

    def as_dict(self) -> Dict[str, float]:
        return {
            "latency_ms": self.latency_ms,
            "payload_bytes": self.payload_bytes,
            "cache_hint": self.cache_hint,
        }


@dataclass
class EndpointPolicy:
    """Policy definition for a single endpoint."""

    endpoint: str
    budget: LeakBudget
    mitigation_toggles: Dict[str, bool] | None = None

    def is_toggle_enabled(self, name: str) -> bool:
        if not self.mitigation_toggles:
            return False
        return bool(self.mitigation_toggles.get(name, False))


class PolicyStore:
    """Container for endpoint policies."""

    def __init__(self, policies: Mapping[str, EndpointPolicy] | None = None) -> None:
        self._policies = dict(policies or {})

    def register(self, policy: EndpointPolicy) -> None:
        self._policies[policy.endpoint] = policy

    def get(self, endpoint: str) -> Optional[EndpointPolicy]:
        return self._policies.get(endpoint)

    def __iter__(self):
        return iter(self._policies.values())
