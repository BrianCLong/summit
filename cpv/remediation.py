"""Remediation planning for privacy violations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

from .report import (
    KMappViolation,
    LDiversityViolation,
    PrivacyEvaluationReport,
    TClosenessViolation,
)


Row = Mapping[str, Any]


@dataclass
class RemediationStep:
    action: str  # "generalize" or "suppress"
    quasi_identifier: Tuple[Any, ...]
    columns: Sequence[str]
    value: Any | None = None


@dataclass
class RemediationPlan:
    steps: List[RemediationStep] = field(default_factory=list)
    generalization_value: Any = "ANY"

    def apply(self, rows: Iterable[Row]) -> List[Dict[str, Any]]:
        """Apply the remediation plan to a tabular dataset."""

        processed = [dict(row) for row in rows]
        suppressed_indices: set[int] = set()
        for step in self.steps:
            if step.action == "generalize":
                for row in processed:
                    if tuple(row[column] for column in step.columns) == step.quasi_identifier:
                        for column in step.columns:
                            row[column] = step.value if step.value is not None else self.generalization_value
            elif step.action == "suppress":
                for idx, row in enumerate(processed):
                    if tuple(row[column] for column in step.columns) == step.quasi_identifier:
                        suppressed_indices.add(idx)
        if suppressed_indices:
            return [row for idx, row in enumerate(processed) if idx not in suppressed_indices]
        return processed


def _deduplicate_steps(steps: List[RemediationStep]) -> List[RemediationStep]:
    seen = set()
    unique: List[RemediationStep] = []
    for step in steps:
        fingerprint = (step.action, step.quasi_identifier, tuple(step.columns), step.value)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        unique.append(step)
    return unique


def _plan_for_k_map(
    violations: Sequence[KMappViolation],
    qi_columns: Sequence[str],
    generalization_value: Any,
) -> List[RemediationStep]:
    steps: List[RemediationStep] = []
    for violation in violations:
        steps.append(
            RemediationStep(
                action="generalize",
                quasi_identifier=violation.quasi_identifier,
                columns=list(qi_columns),
                value=generalization_value,
            )
        )
    return steps


def _plan_for_l_diversity(
    violations: Sequence[LDiversityViolation],
    qi_columns: Sequence[str],
    generalization_value: Any,
) -> List[RemediationStep]:
    steps: List[RemediationStep] = []
    for violation in violations:
        steps.append(
            RemediationStep(
                action="generalize",
                quasi_identifier=violation.quasi_identifier,
                columns=list(qi_columns),
                value=generalization_value,
            )
        )
    return steps


def _plan_for_t_closeness(
    violations: Sequence[TClosenessViolation],
    qi_columns: Sequence[str],
    generalization_value: Any,
) -> List[RemediationStep]:
    steps: List[RemediationStep] = []
    for violation in violations:
        steps.append(
            RemediationStep(
                action="generalize",
                quasi_identifier=violation.quasi_identifier,
                columns=list(qi_columns),
                value=generalization_value,
            )
        )
    return steps


def plan_remediations(
    report: PrivacyEvaluationReport,
    rows: Iterable[Row],
    *,
    generalization_value: Any = "ANY",
) -> RemediationPlan:
    """Create a remediation plan for the detected privacy violations."""

    _ = rows
    if not report.any_violations():
        return RemediationPlan(steps=[], generalization_value=generalization_value)

    qi_columns = list(report.quasi_identifier_columns)
    steps: List[RemediationStep] = []

    steps.extend(_plan_for_k_map(report.k_map_violations, qi_columns, generalization_value))
    steps.extend(_plan_for_l_diversity(report.l_diversity_violations, qi_columns, generalization_value))
    steps.extend(
        _plan_for_t_closeness(report.t_closeness_violations, qi_columns, generalization_value)
    )

    steps = _deduplicate_steps(steps)
    return RemediationPlan(steps=steps, generalization_value=generalization_value)


__all__ = ["plan_remediations", "RemediationPlan", "RemediationStep"]
