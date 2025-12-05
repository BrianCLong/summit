from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional
from uuid import uuid4


@dataclass
class WorldState:
    """Normalized snapshot of a possible future repository state."""

    id: str
    repo_snapshot: Dict[str, Any]
    diffs: List[Dict[str, Any]] = field(default_factory=list)
    intents: List[Any] = field(default_factory=list)
    tasks: List[Any] = field(default_factory=list)
    agents: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    invariants: List[Callable[["WorldState"], bool]] = field(default_factory=list)
    constraints: List[Callable[["WorldState"], bool]] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    architecture: Dict[str, Any] = field(default_factory=dict)
    ci_state: Dict[str, Any] = field(default_factory=dict)
    test_state: Dict[str, Any] = field(default_factory=dict)
    cost: float = 0.0
    safety: Dict[str, Any] = field(default_factory=dict)
    score: float = 0.0

    @classmethod
    def from_sources(
        cls,
        repo_snapshot: Dict[str, Any],
        intents: Optional[Iterable[Any]] = None,
        invariants: Optional[Iterable[Callable[["WorldState"], bool]]] = None,
        constraints: Optional[Iterable[Callable[["WorldState"], bool]]] = None,
        tasks: Optional[Iterable[Any]] = None,
        agents: Optional[Dict[str, Dict[str, Any]]] = None,
        risks: Optional[Iterable[str]] = None,
        architecture: Optional[Dict[str, Any]] = None,
        ci_state: Optional[Dict[str, Any]] = None,
        test_state: Optional[Dict[str, Any]] = None,
        cost: float = 0.0,
        safety: Optional[Dict[str, Any]] = None,
    ) -> "WorldState":
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

    def clone(self) -> "WorldState":
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

    def register_diff(self, diff: Dict[str, Any]) -> None:
        self.diffs.append(diff)

    def register_task(self, task: Any) -> None:
        self.tasks.append(task)

    def register_risk(self, risk: str) -> None:
        if risk not in self.risks:
            self.risks.append(risk)

    def add_agent_state(self, name: str, state: Dict[str, Any]) -> None:
        self.agents[name] = state

    def apply_score(self, value: float) -> None:
        self.score = value
