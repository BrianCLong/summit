from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, List

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.pica import (
    KPIObservation,
    ManifestSource,
    PICAAnalyzer,
    PICAOptions,
    PolicyAction,
    RolloutManifest,
    RolloutPhase,
)

GROUND_TRUTH_EFFECT = 9.8


def build_observations(effect: float = GROUND_TRUTH_EFFECT) -> List[KPIObservation]:
    base_time = datetime(2024, 1, 1)
    governance_base = {"trust_index": 0.92, "safety_margin": 0.88}

    def records_for_unit(
        unit: str,
        is_treated: bool,
        pre_values: Iterable[float],
        post_values: Iterable[float],
    ) -> List[KPIObservation]:
        obs: List[KPIObservation] = []
        pre_list = list(pre_values)
        post_list = list(post_values)
        for offset, value in enumerate(pre_list):
            obs.append(
                KPIObservation(
                    unit=unit,
                    timestamp=base_time + timedelta(days=offset),
                    phase=RolloutPhase.PRE,
                    is_treated=is_treated,
                    kpi_values={"engagement_rate": value},
                    governance_metrics=governance_base,
                )
            )
        for offset, value in enumerate(post_list, start=len(pre_list)):
            obs.append(
                KPIObservation(
                    unit=unit,
                    timestamp=base_time + timedelta(days=offset + 30),
                    phase=RolloutPhase.POST,
                    is_treated=is_treated,
                    kpi_values={"engagement_rate": value},
                    governance_metrics=governance_base,
                )
            )
        return obs

    treated_noise = [0.2, -0.15]
    treated_units = {
        "unit_t1": (100.5, treated_noise[0]),
        "unit_t2": (100.0, treated_noise[1]),
    }

    records: List[KPIObservation] = []
    for unit, (baseline, noise) in treated_units.items():
        pre = [baseline - 0.3, baseline + 0.3]
        post = [baseline + effect + noise, baseline + effect - noise]
        records.extend(records_for_unit(unit, True, pre, post))

    control_units = {
        "unit_c1": [100.1, 100.4, 100.2, 100.3],
        "unit_c2": [99.0, 99.2, 99.1, 99.1],
        "unit_c3": [100.8, 101.0, 100.9, 100.8],
    }

    for unit, stream in control_units.items():
        pre = stream[:2]
        post = stream[2:]
        records.extend(records_for_unit(unit, False, pre, post))

    return records


def build_manifest() -> RolloutManifest:
    return RolloutManifest(
        policy_id="policy-allow-123",
        action=PolicyAction.ALLOW,
        source=ManifestSource.BGPR,
        start_time=datetime(2024, 1, 1),
        end_time=datetime(2024, 2, 1),
        description="Allowlist update for trusted publishers",
    )


def find_estimate(brief, metric: str, method: str):
    for estimate in brief.estimates:
        if estimate.metric == metric and estimate.method == method:
            return estimate
    raise AssertionError(f"Estimate for {metric}/{method} not found")


def test_estimators_recover_planted_effect():
    analyzer = PICAAnalyzer()
    observations = build_observations()
    brief = analyzer.analyze(build_manifest(), observations, ["engagement_rate"])

    for method in ["Difference-in-Differences", "Synthetic Control", "CUPED"]:
        estimate = find_estimate(brief, "engagement_rate", method)
        assert estimate.estimate == pytest.approx(GROUND_TRUTH_EFFECT, abs=0.6)
        assert estimate.interval.lower <= GROUND_TRUTH_EFFECT <= estimate.interval.upper


def test_sensitivity_toggles_adjust_confidence_intervals():
    options = PICAOptions(sensitivity_multipliers={"robust": 1.5, "optimistic": 0.5})
    analyzer = PICAAnalyzer(options=options)
    observations = build_observations()
    brief = analyzer.analyze(build_manifest(), observations, ["engagement_rate"])

    estimate = find_estimate(brief, "engagement_rate", "Difference-in-Differences")
    base_width = estimate.interval.width()
    sens = {result.name: result for result in estimate.sensitivity}

    assert sens["robust"].interval.width() > base_width
    assert sens["optimistic"].interval.width() < base_width


def test_brief_render_is_deterministic():
    analyzer = PICAAnalyzer()
    observations = build_observations()
    brief = analyzer.analyze(build_manifest(), observations, ["engagement_rate"])

    rendered_once = brief.render()
    rendered_twice = brief.render()

    assert rendered_once == rendered_twice
    assert "Policy Impact Brief" in rendered_once
