from intelgraph_py.analytics.bias_audit import BiasAudit, FeedbackLoop, explain_decision


def test_detect_bias_demographic_parity():
    preds = [
        {"group": "A", "outcome": 1},
        {"group": "A", "outcome": 0},
        {"group": "B", "outcome": 0},
        {"group": "B", "outcome": 0},
    ]
    result = BiasAudit.detect_bias(preds, "group", "outcome")
    assert result["rates"] == {"A": 0.5, "B": 0.0}
    assert result["demographic_parity_diff"] == 0.5


def test_continuous_validation_mean():
    history = [0.1, 0.2, 0.3]
    assert BiasAudit.continuous_validation(history) == 0.2


def test_feedback_loop_records_feedback():
    loop = FeedbackLoop()
    loop.add_feedback("analyst1", "needs review", {"id": 1})
    assert loop.get_feedback()[0]["note"] == "needs review"


def test_explain_decision_top_feature():
    explanation = explain_decision({"f1": 0.2, "f2": 0.7})
    assert "f2" in explanation
