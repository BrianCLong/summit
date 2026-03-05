from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class AgentPlan:
    """Deterministic preflight plan for an agent run."""

    goal: str
    constraints: list[str]
    acceptance_criteria: list[str]
    risks: list[str]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)
