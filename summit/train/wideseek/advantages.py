import math
from typing import List

def compute_group_advantages(rewards: List[float], epsilon: float = 1e-8) -> List[float]:
    """
    Computes advantages using group normalization (GRPO).
    """
    if not rewards:
        return []

    mean_r = sum(rewards) / len(rewards)
    variance = sum((r - mean_r) ** 2 for r in rewards) / len(rewards)
    std_r = math.sqrt(variance)

    advantages = [(r - mean_r) / (std_r + epsilon) for r in rewards]
    return advantages
