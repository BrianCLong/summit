import math
from typing import List

def entropic_utility(rewards: List[float], probs: List[float], alpha: float = 0.1) -> float:
    """
    Calculates utility = Mean(Rewards) + alpha * Entropy(Probs).
    Probs should be normalized.
    """
    if not rewards:
        return 0.0

    mean_reward = sum(rewards) / len(rewards)

    entropy = 0.0
    for p in probs:
        if p > 0:
            entropy -= p * math.log(p)

    return mean_reward + alpha * entropy

def top_k_utility(rewards: List[float], k: int) -> float:
    """
    Returns mean of top k rewards.
    """
    if not rewards:
        return 0.0

    sorted_rewards = sorted(rewards, reverse=True)
    top_k = sorted_rewards[:k]
    return sum(top_k) / len(top_k)
