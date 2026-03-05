from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class EngineeringPlan:
    """Deterministic preflight plan schema for autonomous engineering runs."""

    goal: str
    constraints: list[str] = field(default_factory=list)
    acceptance_criteria: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
