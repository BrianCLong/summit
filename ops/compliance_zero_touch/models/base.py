"""Core domain models for the zero-touch compliance engine."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    """Enumeration of compliance severities."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ImpactDimension(str, Enum):
    """Dimensions considered when producing multi-factor scoring."""

    ECONOMIC = "economic"
    RISK = "risk"
    LEGAL = "legal"


@dataclass
class PolicyFinding:
    """Result of a single policy evaluation."""

    control_id: str
    title: str
    description: str
    severity: Severity
    impacted_assets: Sequence[str] = field(default_factory=list)
    remediation: str | None = None
    evidences: Sequence[str] = field(default_factory=list)
    references: Sequence[str] = field(default_factory=list)


@dataclass
class PolicyEvaluationResult:
    """Summary of running a policy adapter against provided material."""

    adapter: str
    findings: list[PolicyFinding] = field(default_factory=list)
    metrics: dict[str, float] = field(default_factory=dict)
    coverage: float = 0.0


@dataclass
class RegulatoryRequirement:
    """Mapping between controls and external regulatory requirements."""

    framework: str
    citation: str
    description: str
    surpass_criteria: str


@dataclass
class MultiFactorScore:
    """Composite scoring for economic, risk, and legal dimensions."""

    scores: dict[ImpactDimension, float]
    rationale: str


@dataclass
class AutoPatchAction:
    """Represents an automated remediation to be applied."""

    id: str
    description: str
    changes: dict[str, str]
    applies_to: Sequence[str]
    estimated_savings: float
    estimated_risk_reduction: float


@dataclass
class HumanReviewItem:
    """Manual correction candidate with context for reviewers."""

    control_id: str
    question: str
    suggested_decision: str
    rationale: str
    stakeholders: Sequence[str]


@dataclass
class ComplianceRunReport:
    """Complete report for a full zero-touch compliance execution."""

    started_at: datetime
    finished_at: datetime
    evaluations: list[PolicyEvaluationResult]
    auto_patches: list[AutoPatchAction]
    human_reviews: list[HumanReviewItem]
    multi_factor_score: MultiFactorScore
    regulatory_alignment: dict[str, list[RegulatoryRequirement]]
    tested_artifacts: Sequence[str]
    validation_results: dict[str, dict[str, float]]

    def to_dict(self) -> dict[str, object]:
        """Serialize the report to a JSON-serializable dictionary."""

        return {
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat(),
            "evaluations": [
                {
                    "adapter": evaluation.adapter,
                    "coverage": evaluation.coverage,
                    "metrics": evaluation.metrics,
                    "findings": [
                        {
                            "control_id": finding.control_id,
                            "title": finding.title,
                            "description": finding.description,
                            "severity": finding.severity.value,
                            "impacted_assets": list(finding.impacted_assets),
                            "remediation": finding.remediation,
                            "evidences": list(finding.evidences),
                            "references": list(finding.references),
                        }
                        for finding in evaluation.findings
                    ],
                }
                for evaluation in self.evaluations
            ],
            "auto_patches": [
                {
                    "id": patch.id,
                    "description": patch.description,
                    "changes": patch.changes,
                    "applies_to": list(patch.applies_to),
                    "estimated_savings": patch.estimated_savings,
                    "estimated_risk_reduction": patch.estimated_risk_reduction,
                }
                for patch in self.auto_patches
            ],
            "human_reviews": [
                {
                    "control_id": review.control_id,
                    "question": review.question,
                    "suggested_decision": review.suggested_decision,
                    "rationale": review.rationale,
                    "stakeholders": list(review.stakeholders),
                }
                for review in self.human_reviews
            ],
            "multi_factor_score": {
                dimension.value: score
                for dimension, score in self.multi_factor_score.scores.items()
            },
            "multi_factor_score_rationale": self.multi_factor_score.rationale,
            "regulatory_alignment": {
                control: [
                    {
                        "framework": requirement.framework,
                        "citation": requirement.citation,
                        "description": requirement.description,
                        "surpass_criteria": requirement.surpass_criteria,
                    }
                    for requirement in requirements
                ]
                for control, requirements in self.regulatory_alignment.items()
            },
            "tested_artifacts": list(self.tested_artifacts),
            "validation_results": self.validation_results,
        }
