from graph_shape_guardrail.stats import calculate_skewness
from graph_shape_guardrail.topk import calculate_top_k_mass

def test_skewness_determinism():
    data = [1, 2, 3, 4, 5, 10, 20]
    result1 = calculate_skewness(data)
    result2 = calculate_skewness(data)
    assert result1 == result2

def test_topk_mass_determinism():
    data = [1, 2, 3, 4, 5, 10, 20]
    result1 = calculate_top_k_mass(data)
    result2 = calculate_top_k_mass(data)
    assert result1 == result2
