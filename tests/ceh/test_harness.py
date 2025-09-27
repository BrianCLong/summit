import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sklearn.linear_model import LogisticRegression

from ceh import CounterfactualEvaluationHarness, load_synthetic_demo


def _build_report(seed: int = 0):
    dataset = load_synthetic_demo(seed=seed)
    model = LogisticRegression(max_iter=1000, random_state=seed)
    harness = CounterfactualEvaluationHarness(model, dataset, random_state=seed)
    return harness.run_full_evaluation(lambda_irm=1.0)


def test_detects_injected_confounder():
    report = _build_report(seed=4)
    detected = [row["feature"] for row in report["spurious_correlations"]["detected_features"]]
    assert "confounder" in detected


def test_irm_penalty_reduces_sensitivity_without_accuracy_collapse():
    report = _build_report(seed=1)
    baseline = report["metrics"]["baseline"]
    irm = report["metrics"]["irm"]

    base_conf = next(
        row["sensitivity"]
        for row in report["feature_ablation"]
        if row["feature"] == "confounder"
    )
    irm_conf = next(
        row["sensitivity"]
        for row in report["irm"]["feature_ablation"]
        if row["feature"] == "confounder"
    )

    assert irm_conf < base_conf * 0.1
    assert irm["counterfactual_sensitivity"] <= baseline["counterfactual_sensitivity"]
    assert irm["accuracy"] >= baseline["accuracy"] - 0.03


def test_reports_are_reproducible_with_same_seed():
    report_a = _build_report(seed=3)
    report_b = _build_report(seed=3)

    # JSON round-trip to ensure ordering does not affect the comparison.
    json_a = json.dumps(report_a, sort_keys=True)
    json_b = json.dumps(report_b, sort_keys=True)
    assert json_a == json_b

    detected = report_a["spurious_correlations"]["detected_features"]
    assert all(entry["spurious_score"] >= 0.0 for entry in detected)
