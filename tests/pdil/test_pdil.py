from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sdk.pdil.adapters import EchoAdapter, TemplateAdapter
from sdk.pdil.cli import serialize_report
from sdk.pdil.models import GoldenCase, GoldenSet
from sdk.pdil.replay import PromptDiffRunner, SeedController
from sdk.pdil.risk import RiskAssessor


def build_case(case_id: str, expected: str, *, impact: float, severity: float) -> GoldenCase:
    return GoldenCase(
        case_id=case_id,
        prompts={"v1": expected, "v2": expected},
        expected_response=expected,
        business_impact=impact,
        failure_severity={"incorrect": severity, "default": severity},
    )


def test_replays_are_deterministic() -> None:
    golden = GoldenSet.from_iterable(
        [
            build_case("case-a", "alpha", impact=1.0, severity=1.0),
            build_case("case-b", "beta", impact=1.0, severity=1.0),
        ]
    )
    adapter = EchoAdapter()
    runner = PromptDiffRunner(golden, {"v1": adapter, "v2": adapter})

    first = runner.run("v1", "v2", seed=123)
    second = runner.run("v1", "v2", seed=123)

    assert json.dumps(serialize_report(first), sort_keys=True) == json.dumps(
        serialize_report(second), sort_keys=True
    )


def test_risk_score_correlates_with_severity() -> None:
    high_severity = build_case("high", "{\"selected\":\"ok\"}", impact=2.0, severity=3.0)
    low_severity = build_case("low", "{\"selected\":\"ok\"}", impact=2.0, severity=1.0)

    golden = GoldenSet.from_iterable([high_severity, low_severity])
    adapter = TemplateAdapter({
        high_severity.expected_response: "wrong",
        low_severity.expected_response: "wrong",
    })
    runner = PromptDiffRunner(golden, {"v1": adapter, "v2": adapter}, risk_assessor=RiskAssessor())
    report = runner.run("v1", "v2", seed=77)

    contributions = {outcome.case.case_id: outcome.candidate.severity for outcome in report.outcomes}
    assert contributions["high"] > contributions["low"]
    assert report.assessment.total_risk > 0


def test_regressions_flagged_in_report() -> None:
    seed = 11
    baseline_adapter = EchoAdapter()
    candidate_adapter = TemplateAdapter({"critical": "wrong"})
    controller = SeedController(seed)
    expected_response = baseline_adapter.generate(
        "critical",
        seed=controller.for_case("fail", "v1"),
    )

    failing = GoldenCase(
        case_id="fail",
        prompts={"v1": "critical", "v2": "critical"},
        expected_response=expected_response,
        business_impact=2.0,
        failure_severity={"incorrect": 2.0, "default": 2.0},
    )

    golden = GoldenSet.from_iterable([failing])
    runner = PromptDiffRunner(golden, {"v1": baseline_adapter, "v2": candidate_adapter})
    report = runner.run("v1", "v2", seed=seed)
    regression_ids = report.assessment.regressions
    assert any(outcome.case.case_id == "fail" for outcome in regression_ids)
