from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence


@dataclass(frozen=True)
class CoherenceRewardConfig:
    enabled: bool = False
    weight: float = 0.0
    max_abs_reward: float = 1.0


def _similarity(a: Any, b: Any) -> float:
    """Deterministic, dependency-free placeholder similarity."""
    return 1.0 if a == b else 0.0


def coherence_reward(decoded_sequence: Sequence[Any], cfg: CoherenceRewardConfig) -> float:
    """Reward consistency between consecutive decoded latent contents.

    Paper concept: auxiliary coherence reward from consistency between VAE-decoded contents.
    (Derived from HF description of arXiv:2601.21598.)
    """
    if not cfg.enabled:
        return 0.0
    if len(decoded_sequence) < 2:
        return 0.0
    score = 0.0
    for i in range(1, len(decoded_sequence)):
        score += _similarity(decoded_sequence[i - 1], decoded_sequence[i])
    reward = score / float(len(decoded_sequence) - 1)
    if reward > cfg.max_abs_reward:
        reward = cfg.max_abs_reward
    if reward < -cfg.max_abs_reward:
        reward = -cfg.max_abs_reward
    return float(reward)
