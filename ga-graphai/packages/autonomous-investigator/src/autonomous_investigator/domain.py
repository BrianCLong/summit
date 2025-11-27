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
    domain: str = "unspecified"


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


@dataclass(frozen=True)
class EvidenceLink:
    """Link between two signals that forms part of an evidence chain."""

    source_id: str
    target_id: str
    rationale: str
    confidence: float


@dataclass(frozen=True)
class EvidenceChain:
    """Ordered collection of evidentiary links supporting a finding."""

    chain_id: str
    links: list[EvidenceLink]
    strength: float
    narrative: str


@dataclass(frozen=True)
class DomainCorrelation:
    """Domain-specific correlation summary for the unified report."""

    domain: str
    signals: list[str]
    coverage: float
    mean_confidence: float
    mean_severity: float
    dominant_types: list[str]


@dataclass(frozen=True)
class CorrelationReport:
    """Cross-domain correlation report with evidence and confidence."""

    case_id: str
    summary: str
    domain_correlations: list[DomainCorrelation]
    evidence_chains: list[EvidenceChain]
    overall_confidence: float
