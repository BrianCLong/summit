import numpy as np


def doubly_robust(policy_probs, logging_probs, rewards, q_hat, v_hat):
    """Compute IPS and Doubly-Robust estimates with capped weights.

    Args:
        policy_probs (np.ndarray): Target policy action probabilities.
        logging_probs (np.ndarray): Behavior policy probabilities (>= 1e-8).
        rewards (np.ndarray): Observed rewards per action.
        q_hat (np.ndarray): Estimated Q-values for taken actions.
        v_hat (float | np.ndarray): Baseline value estimate.

    Returns:
        dict: Means and 95% CIs for IPS and DR estimators.
    """
    w = np.clip(policy_probs / np.maximum(logging_probs, 1e-8), 0, 100)
    ips = w * rewards
    dr = v_hat + w * (rewards - q_hat)
    n = len(rewards)
    return {
        "ips_mean": float(np.mean(ips)),
        "dr_mean": float(np.mean(dr)),
        "ips_ci95": 1.96 * float(np.std(ips, ddof=1) / np.sqrt(n)),
        "dr_ci95": 1.96 * float(np.std(dr, ddof=1) / np.sqrt(n)),
    }
