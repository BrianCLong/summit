from summit.atp_latent.coherence_reward import CoherenceRewardConfig, coherence_reward


def test_disabled_returns_zero():
  assert coherence_reward(["a","a"], CoherenceRewardConfig(enabled=False)) == 0.0

def test_basic_coherence():
  cfg = CoherenceRewardConfig(enabled=True, max_abs_reward=1.0)
  assert coherence_reward(["a","a","a"], cfg) == 1.0
  assert coherence_reward(["a","b"], cfg) == 0.0

def test_capped():
  cfg = CoherenceRewardConfig(enabled=True, max_abs_reward=0.2)
  assert coherence_reward(["a","a","a"], cfg) == 0.2
