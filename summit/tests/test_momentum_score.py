import unittest

from summit.evaluation.startup_momentum.momentum_score import compute_momentum_score


class TestMomentumScore(unittest.TestCase):
    def test_determinism(self):
        score1 = compute_momentum_score("test problem", [], [], {})
        score2 = compute_momentum_score("test problem", [], [], {})
        assert score1 == score2, "Momentum score should be deterministic"

if __name__ == "__main__":
    unittest.main()
