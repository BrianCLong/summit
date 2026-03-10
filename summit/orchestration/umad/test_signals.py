import unittest
from .signals import calculate_sys_au, calculate_sys_eu, calculate_umad_rewards

class TestUMADSignals(unittest.TestCase):
    def test_calculate_sys_au(self):
        # High entropy (uniform distribution)
        probs_high = [0.25, 0.25, 0.25, 0.25]
        au_high = calculate_sys_au(probs_high)

        # Low entropy (concentrated distribution)
        probs_low = [0.9, 0.05, 0.05, 0.0]
        au_low = calculate_sys_au(probs_low)

        self.assertGreater(au_high, au_low)
        self.assertAlmostEqual(au_high, 2.0) # -4 * (0.25 * log2(0.25)) = 2.0

    def test_calculate_sys_eu(self):
        # Low divergence (agents agree)
        dist_1 = [0.8, 0.2]
        dist_2 = [0.8, 0.2]
        eu_low = calculate_sys_eu([dist_1, dist_2])
        self.assertAlmostEqual(eu_low, 0.0)

        # High divergence (agents disagree)
        dist_3 = [0.9, 0.1]
        dist_4 = [0.1, 0.9]
        eu_high = calculate_sys_eu([dist_3, dist_4])
        self.assertGreater(eu_high, eu_low)

    def test_calculate_umad_rewards(self):
        config = {
            "training": {
                "accuracy_reward_weight": 1.0,
                "au_reward_weight": 0.5,
                "eu_influence_reward_weight": 0.8
            }
        }

        rewards = calculate_umad_rewards(
            agent_accuracy=1.0,
            sys_au=0.5,
            peer_accuracy_gain=0.2,
            config=config
        )

        self.assertEqual(rewards["r_acc"], 1.0)
        self.assertEqual(rewards["r_au"], -0.25)
        self.assertAlmostEqual(rewards["r_eu"], 0.16)
        self.assertEqual(rewards["total_reward"], 0.91)

if __name__ == '__main__':
    unittest.main()
