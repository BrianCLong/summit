from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4


@dataclass
class WorldState:
    """Normalized snapshot of a possible future repository state."""

    id: str
    repo_snapshot: dict[str, Any]
    diffs: list[dict[str, Any]] = field(default_factory=list)
    intents: list[Any] = field(default_factory=list)
    tasks: list[Any] = field(default_factory=list)
    agents: dict[str, dict[str, Any]] = field(default_factory=dict)
    invariants: list[Callable[[WorldState], bool]] = field(default_factory=list)
    constraints: list[Callable[[WorldState], bool]] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    architecture: dict[str, Any] = field(default_factory=dict)
    ci_state: dict[str, Any] = field(default_factory=dict)
    test_state: dict[str, Any] = field(default_factory=dict)
    cost: float = 0.0
    safety: dict[str, Any] = field(default_factory=dict)
    score: float = 0.0

    @classmethod
    def from_sources(
        cls,
        repo_snapshot: dict[str, Any],
        intents: Iterable[Any] | None = None,
        invariants: Iterable[Callable[[WorldState], bool]] | None = None,
        constraints: Iterable[Callable[[WorldState], bool]] | None = None,
        tasks: Iterable[Any] | None = None,
        agents: dict[str, dict[str, Any]] | None = None,
        risks: Iterable[str] | None = None,
        architecture: dict[str, Any] | None = None,
        ci_state: dict[str, Any] | None = None,
        test_state: dict[str, Any] | None = None,
        cost: float = 0.0,
        safety: dict[str, Any] | None = None,
    ) -> WorldState:
        """Build a new world state from upstream adapters."""

        return cls(
            id=str(uuid4()),
            repo_snapshot=repo_snapshot,
            diffs=[],
            intents=list(intents or []),
            tasks=list(tasks or []),
            agents=dict(agents or {}),
            invariants=list(invariants or []),
            constraints=list(constraints or []),
            risks=list(risks or []),
            architecture=dict(architecture or {}),
            ci_state=dict(ci_state or {}),
            test_state=dict(test_state or {}),
            cost=cost,
            safety=dict(safety or {}),
        )

    def clone(self) -> WorldState:
        """Create a deep-ish clone suitable for mutation without side effects."""

        return WorldState(
            id=str(uuid4()),
            repo_snapshot={**self.repo_snapshot},
            diffs=[dict(d) for d in self.diffs],
            intents=list(self.intents),
            tasks=list(self.tasks),
            agents={name: dict(meta) for name, meta in self.agents.items()},
            invariants=list(self.invariants),
            constraints=list(self.constraints),
            risks=list(self.risks),
            architecture={**self.architecture},
            ci_state={**self.ci_state},
            test_state={**self.test_state},
            cost=self.cost,
            safety={**self.safety},
            score=self.score,
        )

    def register_diff(self, diff: dict[str, Any]) -> None:
        self.diffs.append(diff)

    def register_task(self, task: Any) -> None:
        self.tasks.append(task)

    def register_risk(self, risk: str) -> None:
        if risk not in self.risks:
            self.risks.append(risk)

    def add_agent_state(self, name: str, state: dict[str, Any]) -> None:
        self.agents[name] = state

    def apply_score(self, value: float) -> None:
        self.score = value
