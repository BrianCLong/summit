from simulator import simulate_counterfactual


def test_simulate_counterfactual_returns_result():
    result = simulate_counterfactual("A", "uses")
    assert "result" in result
