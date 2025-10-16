"""Contextual bandit learners for UI/ETL assistance."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np


@dataclass(slots=True)
class LinUCBConfig:
    alpha: float = 0.2


class LinUCB:
    """Simple LinUCB implementation for contextual recommendation."""

    def __init__(
        self, actions: Iterable[str], context_dim: int, config: LinUCBConfig | None = None
    ) -> None:
        self._actions = list(actions)
        self._context_dim = context_dim
        self._config = config or LinUCBConfig()
        self._a_matrices: dict[str, np.ndarray] = {
            action: np.eye(context_dim) for action in self._actions
        }
        self._b_vectors: dict[str, np.ndarray] = {
            action: np.zeros((context_dim, 1)) for action in self._actions
        }

    def select(self, context: np.ndarray, mask: Iterable[str] | None = None) -> tuple[str, float]:
        allowed = set(mask) if mask is not None else set(self._actions)
        best_action = None
        best_score = float("-inf")
        context = context.reshape(-1, 1)
        for action in self._actions:
            if action not in allowed:
                continue
            a_inv = np.linalg.inv(self._a_matrices[action])
            theta = a_inv @ self._b_vectors[action]
            exploit = float(theta.T @ context)
            explore = self._config.alpha * float(np.sqrt(context.T @ a_inv @ context))
            score = exploit + explore
            if score > best_score:
                best_score = score
                best_action = action
        if best_action is None:
            raise RuntimeError("No actions available after masking")
        return best_action, best_score

    def update(self, context: np.ndarray, action: str, reward: float) -> None:
        context = context.reshape(-1, 1)
        self._a_matrices[action] += context @ context.T
        self._b_vectors[action] += reward * context
