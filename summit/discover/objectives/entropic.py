from __future__ import annotations

import math
from typing import Iterable


def entropic_weights(rewards: Iterable[float], beta: float) -> list[float]:
    reward_list = list(rewards)
    if not reward_list:
        return []
    max_reward = max(reward_list)
    exp_terms = [math.exp(beta * (reward - max_reward)) for reward in reward_list]
    total = sum(exp_terms)
    if total == 0:
        return [0.0 for _ in reward_list]
    return [term / total for term in exp_terms]


def entropic_objective(rewards: Iterable[float], beta: float) -> float:
    reward_list = list(rewards)
    if not reward_list:
        return 0.0
    max_reward = max(reward_list)
    exp_terms = [math.exp(beta * (reward - max_reward)) for reward in reward_list]
    mean_exp = sum(exp_terms) / len(exp_terms)
    if mean_exp <= 0:
        return float("-inf")
    return max_reward + math.log(mean_exp) / beta
