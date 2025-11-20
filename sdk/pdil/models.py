"""Core data models for the Prompt Diff Impact Lab (PDIL)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional


@dataclass
class GoldenCase:
    """Represents a single evaluation scenario in the golden set."""

    case_id: str
    prompts: Dict[str, str]
    expected_response: str
    business_impact: float = 1.0
    coverage_tags: List[str] = field(default_factory=list)
    failure_severity: Dict[str, float] = field(default_factory=dict)
    metadata: Dict[str, str] = field(default_factory=dict)

    def severity_for(self, taxonomy: str) -> float:
        return self.failure_severity.get(taxonomy, self.failure_severity.get("default", 1.0))


@dataclass
class PromptRun:
    """Captures the result of running a prompt version through a model."""

    prompt_version: str
    model_name: str
    response: str
    passed: bool
    taxonomy: Optional[str]
    severity: float


@dataclass
class PromptDiffOutcome:
    """Compares baseline and candidate outputs for a golden case."""

    case: GoldenCase
    baseline: PromptRun
    candidate: PromptRun

    @property
    def coverage_delta(self) -> float:
        return float(self.candidate.passed) - float(self.baseline.passed)

    @property
    def regression_detected(self) -> bool:
        return self.baseline.passed and not self.candidate.passed


@dataclass
class GoldenSet:
    """Collection of golden cases with helper lookups."""

    cases: List[GoldenCase]

    def by_tag(self) -> Dict[str, List[GoldenCase]]:
        tags: Dict[str, List[GoldenCase]] = {}
        for case in self.cases:
            for tag in case.coverage_tags or ["__untagged__"]:
                tags.setdefault(tag, []).append(case)
        return tags

    @classmethod
    def from_iterable(cls, cases: Iterable[GoldenCase]) -> "GoldenSet":
        return cls(list(cases))


@dataclass
class RiskAssessment:
    """Summary of risk metrics for a prompt diff."""

    total_risk: float
    coverage_delta: float
    taxonomy_counts: Dict[str, int]
    regressions: List[PromptDiffOutcome]


@dataclass
class ReplayReport:
    """Complete report produced by a PDIL replay run."""

    seed: int
    outcomes: List[PromptDiffOutcome]
    assessment: RiskAssessment

    def regression_cases(self) -> List[str]:
        return [outcome.case.case_id for outcome in self.outcomes if outcome.regression_detected]

    def coverage_by_tag(self) -> Dict[str, float]:
        tagged = {}
        for tag, cases in GoldenSet(self.cases_from_outcomes()).by_tag().items():
            total = len(cases)
            passed = sum(1 for case in cases if self._candidate_pass(case.case_id))
            tagged[tag] = passed / total if total else 0.0
        return tagged

    def _candidate_pass(self, case_id: str) -> bool:
        for outcome in self.outcomes:
            if outcome.case.case_id == case_id:
                return outcome.candidate.passed
        return False

    def cases_from_outcomes(self) -> List[GoldenCase]:
        return [outcome.case for outcome in self.outcomes]
