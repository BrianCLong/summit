from explain import explain_prediction


def test_explain_prediction_returns_structure():
    result = explain_prediction()
    assert "model" in result
    assert "data" in result
