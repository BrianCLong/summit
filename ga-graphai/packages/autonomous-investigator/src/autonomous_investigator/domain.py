"""Domain models for the autonomous investigator engine."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Signal:
    """Observable signal that can trigger or shape a hypothesis."""

    id: str
    description: str
    signal_type: str
    severity: float
    confidence: float


@dataclass(frozen=True)
class Objective:
    """Investigation goal with measurable outcome."""

    description: str
    priority: int
    success_metric: str


@dataclass(frozen=True)
class Hypothesis:
    """Potential explanation or investigative angle."""

    id: str
    summary: str
    probability: float
    novelty_score: float
    expected_impact: float
    supporting_signals: list[str]
    counterfactual_penalty: float


@dataclass(frozen=True)
class Task:
    """Concrete autonomous task to progress an investigation."""

    id: str
    title: str
    action: str
    owning_agent: str
    dependencies: list[str] = field(default_factory=list)
    innovation_vectors: list[str] = field(default_factory=list)
    estimated_hours: float = 1.0
    verification_metric: str = ""


@dataclass(frozen=True)
class Plan:
    """End-to-end orchestrated investigation plan."""

    case_id: str
    hypotheses: list[Hypothesis]
    tasks: list[Task]
    differentiation_factors: list[str]
    counterfactual_branches: list[str]
    assurance_score: float
