from __future__ import annotations

from typing import Dict, Iterable, List

from .agent_models import BaseAgentModel
from .constraint_engine import ConstraintEngine
from .world_state import WorldState


class StateMutationEngine:
    """Expands a world state into validated future states."""

    def __init__(
        self,
        agent_models: Dict[str, BaseAgentModel],
        constraint_engine: ConstraintEngine,
    ):
        self.agent_models = agent_models
        self.constraint_engine = constraint_engine

    def expand(self, state: WorldState) -> List[WorldState]:
        next_worlds: List[WorldState] = []
        for model in self.agent_models.values():
            for action in model.predict_actions(state):
                candidate = state.clone()
                action.apply(candidate)
                candidate.add_agent_state(model.name, {"last_action": action.kind})
                if self.constraint_engine.validate(candidate):
                    next_worlds.append(candidate)
        return next_worlds
