"""Golden set replay engine for PDIL."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .adapters import ModelAdapter
from .models import GoldenCase, GoldenSet, PromptDiffOutcome, PromptRun, ReplayReport
from .risk import RiskAssessor
from .taxonomy import classify_failure


@dataclass
class SeedController:
    """Deterministic seed generator for replay sessions."""

    base_seed: int

    def for_case(self, case_id: str, prompt_version: str) -> int:
        return abs(hash((self.base_seed, case_id, prompt_version))) % (2**32)


class PromptDiffRunner:
    """Runs prompt versions against a golden set and computes outcomes."""

    def __init__(
        self,
        golden_set: GoldenSet,
        adapters: Dict[str, ModelAdapter],
        risk_assessor: Optional[RiskAssessor] = None,
    ) -> None:
        self.golden_set = golden_set
        self.adapters = adapters
        self.risk_assessor = risk_assessor or RiskAssessor()

    def run(
        self,
        baseline_version: str,
        candidate_version: str,
        *,
        seed: int = 0,
        shuffle: bool = False,
    ) -> ReplayReport:
        controller = SeedController(seed)
        outcomes: List[PromptDiffOutcome] = []
        cases = list(self.golden_set.cases)
        if shuffle:
            rng = random.Random(seed)
            rng.shuffle(cases)
        for case in cases:
            baseline_prompt = case.prompts.get(baseline_version)
            candidate_prompt = case.prompts.get(candidate_version)
            if baseline_prompt is None or candidate_prompt is None:
                raise KeyError(f"Prompt version missing for case {case.case_id}")
            baseline_run = self._execute(case, baseline_version, baseline_prompt, controller)
            candidate_run = self._execute(case, candidate_version, candidate_prompt, controller)
            outcomes.append(PromptDiffOutcome(case=case, baseline=baseline_run, candidate=candidate_run))
        assessment = self.risk_assessor.assess(outcomes)
        return ReplayReport(seed=seed, outcomes=outcomes, assessment=assessment)

    def _execute(
        self,
        case: GoldenCase,
        prompt_version: str,
        prompt: str,
        controller: SeedController,
    ) -> PromptRun:
        adapter = self._adapter_for(prompt_version)
        seed = controller.for_case(case.case_id, prompt_version) if adapter.supports_seed_control else None
        response = adapter.generate(prompt, seed=seed)
        passed, taxonomy = classify_failure(case, response)
        severity = case.severity_for(taxonomy or "default")
        return PromptRun(
            prompt_version=prompt_version,
            model_name=adapter.name,
            response=response,
            passed=passed,
            taxonomy=taxonomy,
            severity=severity,
        )

    def _adapter_for(self, prompt_version: str) -> ModelAdapter:
        adapter = self.adapters.get(prompt_version)
        if adapter is None:
            if len(set(self.adapters.values())) == 1:
                # Single adapter shared by all versions.
                return next(iter(self.adapters.values()))
            raise KeyError(f"No adapter configured for version '{prompt_version}'")
        return adapter


def load_golden_set(path: Path) -> GoldenSet:
    payload = json.loads(path.read_text())
    cases = [_case_from_dict(item) for item in payload.get("cases", [])]
    return GoldenSet(cases)


def load_cases(cases: Iterable[Dict[str, object]]) -> GoldenSet:
    return GoldenSet([_case_from_dict(item) for item in cases])


def _case_from_dict(item: Dict[str, object]) -> GoldenCase:
    return GoldenCase(
        case_id=str(item["case_id"]),
        prompts=dict(item["prompts"]),
        expected_response=str(item["expected_response"]),
        business_impact=float(item.get("business_impact", 1.0)),
        coverage_tags=list(item.get("coverage_tags", [])),
        failure_severity=dict(item.get("failure_severity", {})),
        metadata=dict(item.get("metadata", {})),
    )
