# services/analytics/offline_eval.py
import numpy as np


def ips(propensities, rewards, policy_probs):
    # propensities: logged probs under behavior policy; policy_probs: new policy probs for same actions
    w = policy_probs / np.clip(propensities, 1e-6, 1.0)
    return float(np.mean(w * rewards))
