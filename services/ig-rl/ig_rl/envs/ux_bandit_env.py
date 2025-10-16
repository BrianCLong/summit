"""Contextual bandit abstraction for ETL/NL->Cypher assistance."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import numpy as np


@dataclass(slots=True)
class BanditFeedback:
    context: np.ndarray
    action: str
    reward: float
    metadata: dict[str, float]


class UxBanditEnv:
    """Collects feedback events and feeds them to contextual bandit learners."""

    def __init__(self, action_catalog: Sequence[str], feature_dim: int = 64) -> None:
        self._action_catalog = list(action_catalog)
        self._feature_dim = feature_dim

    def encode_context(self, raw_event: dict[str, float]) -> np.ndarray:
        vector = np.zeros(self._feature_dim, dtype=np.float32)
        for idx, (_, value) in enumerate(sorted(raw_event.items())):
            if idx >= self._feature_dim:
                break
            vector[idx] = float(value)
        return vector

    def candidate_actions(self, policy_mask: Iterable[str]) -> list[str]:
        allowed = set(policy_mask)
        return [action for action in self._action_catalog if action in allowed]

    def build_feedback(self, event: dict[str, float], action: str, reward: float) -> BanditFeedback:
        context = self.encode_context(event)
        return BanditFeedback(
            context=context, action=action, reward=reward, metadata={"raw_reward": reward}
        )
