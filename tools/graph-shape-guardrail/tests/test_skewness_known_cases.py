import pytest
from graph_shape_guardrail.stats import calculate_skewness


def test_skewness_symmetric():
    # Symmetric distribution should have 0 skewness
    data = [1, 2, 3, 4, 5]
    # Use approx for float comparison if needed, but for perfectly symmetric it should be 0.0
    assert calculate_skewness(data) == pytest.approx(0.0)

def test_skewness_positive():
    # Positive skew (right-tailed)
    data = [1, 1, 1, 1, 100]
    assert calculate_skewness(data) > 0

def test_skewness_negative():
    # Negative skew (left-tailed)
    data = [1, 100, 100, 100, 100]
    assert calculate_skewness(data) < 0

def test_skewness_small_n():
    assert calculate_skewness([1, 2]) == 0.0
