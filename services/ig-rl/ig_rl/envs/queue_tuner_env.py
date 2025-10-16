"""Queue tuning environment for safe RL with SLA constraints."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import numpy as np


@dataclass(slots=True)
class QueueState:
    backlog: float
    sla_breach_prob: float
    cost: float
    action_mask: Sequence[str]


class QueueTunerEnv:
    """Simulated environment for triage queue optimization."""

    def __init__(self, actions: Sequence[str], cost_budget: float = 1.0) -> None:
        self._actions = list(actions)
        self._cost_budget = cost_budget
        self._state = QueueState(
            backlog=0.5, sla_breach_prob=0.1, cost=0.1, action_mask=self._actions
        )

    def reset(self) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        self._state = QueueState(
            backlog=0.5, sla_breach_prob=0.1, cost=0.1, action_mask=self._actions
        )
        observation = self._encode_state(self._state)
        return observation, {"mask": np.ones(len(self._actions), dtype=np.int8)}

    def step(self, action_idx: int) -> tuple[np.ndarray, float, bool, dict[str, float]]:
        if action_idx >= len(self._actions):
            raise IndexError("Action index out of range")
        action = self._actions[action_idx]

        backlog_delta = 0.05 if "prioritize" in action else -0.02
        cost_delta = 0.2 if "expedite" in action else 0.05
        sla_delta = -0.03 if "quality" in action else 0.01

        backlog = max(0.0, min(1.0, self._state.backlog + backlog_delta))
        cost = max(0.0, self._state.cost + cost_delta)
        sla = max(0.0, min(1.0, self._state.sla_breach_prob + sla_delta))

        penalty = max(0.0, cost - self._cost_budget)
        reward = (1 - backlog) - sla - penalty

        self._state = QueueState(
            backlog=backlog, sla_breach_prob=sla, cost=cost, action_mask=self._actions
        )
        observation = self._encode_state(self._state)
        done = bool(backlog < 0.1 or sla < 0.05)
        info = {"cost": cost, "penalty": penalty, "sla_breach_prob": sla}
        return observation, float(reward), done, info

    def candidate_actions(self, mask: Iterable[str]) -> list[str]:
        allowed = set(mask)
        return [action for action in self._actions if action in allowed]

    @staticmethod
    def _encode_state(state: QueueState) -> np.ndarray:
        return np.asarray([state.backlog, state.sla_breach_prob, state.cost], dtype=np.float32)
