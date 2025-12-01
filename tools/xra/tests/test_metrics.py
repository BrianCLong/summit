from pathlib import Path

import pytest

from xra.explanations import explain_rank_shift
from xra.metrics import compute_bias_metrics
from xra.replay import load_retrieval_log

EXAMPLES = Path(__file__).resolve().parents[1] / "examples"


def test_bias_alerts_detect_injected_shift():
    baseline = load_retrieval_log(EXAMPLES / "sample_retrieval_v1.json")
    candidate = load_retrieval_log(EXAMPLES / "sample_retrieval_v2.json")

    metrics = compute_bias_metrics(baseline, candidate, k_values=(3, 5))

    fairness_alerts = [alert for alert in metrics["alerts"] if str(alert["type"]).startswith("fairness@")]
    assert fairness_alerts, "Expected at least one fairness alert to be triggered"
    for alert in fairness_alerts:
        k = int(alert["k"])
        assert (
            metrics["candidate"]["fairness"][k].average
            < metrics["baseline"]["fairness"][k].average
        )

    exposure_alert = [alert for alert in metrics["alerts"] if alert["type"] == "exposure"]
    assert exposure_alert, "Exposure disparity should increase in biased candidate"


def test_explanations_match_surrogate_predictions():
    baseline = load_retrieval_log(EXAMPLES / "sample_retrieval_v1.json")
    candidate = load_retrieval_log(EXAMPLES / "sample_retrieval_v2.json")

    explanations = explain_rank_shift(baseline, candidate, top_n=3)
    assert explanations, "Should produce explanations for detected shifts"

    for explanation in explanations:
        total = explanation.intercept + sum(explanation.ablation_effects.values())
        assert pytest.approx(total, rel=1e-6) == explanation.predicted_score
        # SHAP-lite values should highlight at least one driver.
        assert explanation.shap_contributions, "Expected feature contributions"
        # Explanations must correspond to actual rank changes.
        assert explanation.rank_shift != 0
