"""Graph COA environment bridging IntelGraph simulators with RL agents."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import numpy as np

try:  # pragma: no cover - optional dependency wiring
    import gymnasium as gym
    from gymnasium import spaces
except Exception:  # gymnasium is optional in CI
    gym = None  # type: ignore
    spaces = None  # type: ignore


@dataclass(slots=True)
class CoaState:
    """Represents a snapshot of the COA simulation."""

    case_id: str
    session_id: str
    step_idx: int
    observation: np.ndarray
    candidate_actions: Sequence[str]
    terminal: bool


class GraphCoaEnv(gym.Env if gym else object):  # type: ignore[misc]
    """Policy-aware environment with action masking."""

    metadata = {"render.modes": []}

    def __init__(
        self,
        *,
        simulator_client,
        policy_client,
        reward_hub,
        max_steps: int = 20,
        reward_name: str = "default",
    ) -> None:
        self._sim = simulator_client
        self._policy = policy_client
        self._reward_hub = reward_hub
        self._max_steps = max_steps
        self._reward_name = reward_name
        self._state: CoaState | None = None
        self._action_map: list[str] = []

        self.observation_space = (
            spaces.Box(low=-np.inf, high=np.inf, shape=(256,), dtype=np.float32) if spaces else None
        )
        self.action_space = spaces.Discrete(512) if spaces else None

    async def reset(self, *, seed: int | None = None, options: dict[str, Any] | None = None):
        if seed is not None:  # pragma: no cover - gym compatibility only
            np.random.seed(seed)
        options = options or {}
        case_id = options.get("case_id")
        session = await self._sim.start_session(case_id)
        session_id = session.get("sessionId", "unknown")
        observation = self._embed(session.get("initialState", {}))
        candidates = session.get("candidateSteps", [])
        allowed = await self._policy.allowed_actions(case_id, candidates)
        self._action_map = list(allowed)
        self._state = CoaState(
            case_id=case_id,
            session_id=session_id,
            step_idx=0,
            observation=observation,
            candidate_actions=self._action_map,
            terminal=False,
        )
        return observation, {"mask": self._mask()}

    async def step(self, action_idx: int) -> tuple[np.ndarray, float, bool, dict[str, Any]]:
        if self._state is None:
            raise RuntimeError("Environment must be reset before stepping")
        if action_idx >= len(self._action_map):
            return self._state.observation, -1.0, True, {"violation": "invalid_action"}

        action = self._action_map[action_idx]
        transition = await self._sim.apply(self._state.session_id, action)
        observation = self._embed(transition.get("state", {}))
        reward_obs = self._reward_hub.evaluate(self._reward_name, transition.get("metrics", {}))

        terminal = bool(transition.get("terminal")) or self._state.step_idx + 1 >= self._max_steps
        allowed = await self._policy.allowed_actions(
            self._state.case_id, transition.get("candidateSteps", [])
        )
        self._action_map = list(allowed)
        self._state = CoaState(
            case_id=self._state.case_id,
            session_id=self._state.session_id,
            step_idx=self._state.step_idx + 1,
            observation=observation,
            candidate_actions=self._action_map,
            terminal=terminal,
        )
        info = {"mask": self._mask(), "reward_components": reward_obs.components}
        return observation, float(reward_obs.reward), terminal, info

    def _embed(self, snapshot: dict[str, Any]) -> np.ndarray:
        features = snapshot.get("features") or snapshot.get("state") or []
        array = np.zeros(256, dtype=np.float32)
        upto = min(len(features), 256)
        array[:upto] = np.asarray(features[:upto], dtype=np.float32)
        return array

    def _mask(self) -> np.ndarray:
        mask = np.zeros(len(self._action_map), dtype=np.int8)
        mask[: len(self._action_map)] = 1
        return mask

    def action_mask(self) -> Sequence[bool]:
        return [True] * len(self._action_map)

    def render(self):  # pragma: no cover - for completeness
        return None
