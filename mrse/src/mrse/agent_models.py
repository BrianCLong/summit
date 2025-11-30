from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Protocol

from .world_state import WorldState


class Action(Protocol):
    """Typed action returned by agent models."""

    kind: str

    def apply(self, state: WorldState) -> None:
        ...


@dataclass
class CodeMutationAction:
    diff: Dict[str, Any]
    kind: str = "code_mutation"

    def apply(self, state: WorldState) -> None:
        state.register_diff(self.diff)


@dataclass
class TaskCreationAction:
    task: Any
    kind: str = "task_creation"

    def apply(self, state: WorldState) -> None:
        state.register_task(self.task)


class BaseAgentModel:
    """Base interface for predictive agent behavior."""

    name: str

    def predict_actions(self, state: WorldState) -> Iterable[Action]:
        raise NotImplementedError


class JulesModel(BaseAgentModel):
    name = "jules"

    def predict_actions(self, state: WorldState) -> Iterable[Action]:
        # Example heuristic: prioritize tasks with missing owners and propose a diff.
        if not state.tasks:
            yield TaskCreationAction({"title": "Seed roadmap task", "owner": self.name})
        yield CodeMutationAction({"path": "docs/roadmap.md", "change": "add-proposal"})


class CodexModel(BaseAgentModel):
    name = "codex"

    def predict_actions(self, state: WorldState) -> Iterable[Action]:
        # Example heuristic: add automated test coverage to recent diffs.
        if state.diffs:
            yield CodeMutationAction({"path": "tests/auto_generated.py", "change": "harden"})
        else:
            yield TaskCreationAction({"title": "Bootstrap test harness", "owner": self.name})


def default_agent_models() -> Dict[str, BaseAgentModel]:
    return {model.name: model for model in (JulesModel(), CodexModel())}
