from math import isclose
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "python"))

import pytest

from fae import (
    SecureAggregator,
    apply_dp_noise,
    compute_cuped_uplift,
    generate_report,
    markov_attribution,
    run_bias_checks,
    shapley_attribution,
    slice_metrics,
    verify_report,
)


RAW_EVENTS = [
    {
        "user": 1,
        "group": "control",
        "outcome": 1.2,
        "covariate": 0.8,
        "path": ["email", "search"],
        "cohort": {"region": "na", "segment": "a"},
    },
    {
        "user": 2,
        "group": "treatment",
        "outcome": 1.6,
        "covariate": 1.0,
        "path": ["email", "social"],
        "cohort": {"region": "na", "segment": "a"},
    },
    {
        "user": 3,
        "group": "treatment",
        "outcome": 0.4,
        "covariate": 0.6,
        "path": ["search"],
        "cohort": {"region": "eu", "segment": "b"},
    },
    {
        "user": 4,
        "group": "control",
        "outcome": 0.7,
        "covariate": 0.9,
        "path": ["social", "search"],
        "cohort": {"region": "eu", "segment": "b"},
    },
]


@pytest.fixture(scope="module")
def aggregator():
    return SecureAggregator.from_events(RAW_EVENTS)


def _direct_cuped(events):
    control = [e for e in events if e["group"] == "control"]
    treatment = [e for e in events if e["group"] == "treatment"]

    def stats(records):
        n = len(records)
        sum_y = sum(r["outcome"] for r in records)
        sum_y2 = sum(r["outcome"] ** 2 for r in records)
        sum_x = sum(r["covariate"] for r in records)
        sum_x2 = sum(r["covariate"] ** 2 for r in records)
        sum_xy = sum(r["covariate"] * r["outcome"] for r in records)
        return n, sum_y, sum_y2, sum_x, sum_x2, sum_xy

    sc = stats(control)
    st = stats(treatment)

    from fae.aggregates import CupedAggregate

    control_agg = CupedAggregate(*sc)
    treatment_agg = CupedAggregate(*st)
    return compute_cuped_uplift(control_agg, treatment_agg)


def test_cuped_matches_baseline(aggregator):
    cohort_metrics = next(
        iter(slice_metrics(aggregator.metrics, {"region": "na", "segment": "a"}).values())
    )
    result = compute_cuped_uplift(cohort_metrics.control, cohort_metrics.treatment)
    baseline = _direct_cuped(RAW_EVENTS[:2])  # first cohort (region=na, segment=a)
    assert isclose(result.uplift, baseline.uplift, rel_tol=1e-6, abs_tol=1e-6)


def test_shapley_and_markov_match_raw_counts(aggregator):
    cohort_metrics = next(
        iter(slice_metrics(aggregator.metrics, {"region": "na", "segment": "a"}).values())
    )
    aggregated = cohort_metrics.path_conversions
    raw_counts = {}
    for event in RAW_EVENTS[:2]:
        path = tuple(event["path"])
        raw_counts[path] = raw_counts.get(path, 0.0) + 1.0
    assert shapley_attribution(aggregated) == pytest.approx(
        shapley_attribution(raw_counts), rel=1e-6
    )
    assert markov_attribution(aggregated) == pytest.approx(
        markov_attribution(raw_counts), rel=1e-6
    )


def test_dp_noise_changes_results_predictably(aggregator):
    cohort_metrics = next(
        iter(slice_metrics(aggregator.metrics, {"region": "na", "segment": "a"}).values())
    )
    values = [
        cohort_metrics.control.sum_y,
        cohort_metrics.treatment.sum_y,
    ]
    noisy = apply_dp_noise(values, epsilon=0.5, seed=42)
    assert noisy != pytest.approx(values)
    assert noisy == pytest.approx(
        apply_dp_noise(values, epsilon=0.5, seed=42), rel=1e-9
    )


def test_reports_are_deterministic(aggregator):
    cohort_metrics = next(
        iter(slice_metrics(aggregator.metrics, {"region": "na", "segment": "a"}).values())
    )
    payload = {
        "uplift": compute_cuped_uplift(cohort_metrics.control, cohort_metrics.treatment),
        "shapley": shapley_attribution(cohort_metrics.path_conversions),
        "markov": markov_attribution(cohort_metrics.path_conversions),
        "bias": run_bias_checks({cohort_metrics.cohort: cohort_metrics}),
    }
    secret = "fae-secret"
    report1 = generate_report(payload, secret)
    report2 = generate_report(payload, secret)
    assert report1 == report2
    assert verify_report(report1, secret)


def test_cohort_slice(aggregator):
    sliced = slice_metrics(aggregator.metrics, {"region": "na"})
    assert len(sliced) == 1
    cohort = next(iter(sliced.values()))
    expected = tuple(sorted((("region", "na"), ("segment", "a"))))
    assert cohort.cohort == expected

