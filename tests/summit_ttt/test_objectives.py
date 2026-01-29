from summit_ttt.objectives import entropic_utility, top_k_utility
import math

def test_entropic_utility():
    rewards = [1.0, 0.0]
    probs = [0.5, 0.5]
    alpha = 1.0

    # Mean reward = 0.5
    # Entropy = -0.5*ln(0.5) - 0.5*ln(0.5) = -ln(0.5) = ln(2) approx 0.693
    # Utility = 0.5 + 0.693 = 1.193

    u = entropic_utility(rewards, probs, alpha)
    expected_entropy = math.log(2)
    assert abs(u - (0.5 + expected_entropy)) < 1e-6

def test_top_k_utility():
    rewards = [10, 5, 8, 1, 9]
    k = 3
    # Top 3: 10, 9, 8. Mean = 27/3 = 9.

    u = top_k_utility(rewards, k)
    assert u == 9.0

def test_top_k_empty():
    assert top_k_utility([], 3) == 0.0
