"""Core primitives for interacting with a protected API surface."""

from __future__ import annotations

import random
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field


@dataclass
class AttackSession:
    """Represents a single offensive attempt against the protected API."""

    agent_name: str
    seed: int
    timeline: list[dict[str, object]] = field(default_factory=list)

    def record(
        self,
        prompt: str,
        response: str,
        timestamp: float,
        metadata: dict[str, object] | None = None,
    ) -> None:
        entry = {
            "prompt": prompt,
            "response": response,
            "timestamp": timestamp,
        }
        if metadata:
            entry["metadata"] = metadata
        self.timeline.append(entry)


class ProtectedAPI:
    """A simple protected API abstraction with pluggable defenses."""

    def __init__(
        self,
        knowledge_base: Sequence[str],
        canaries: Sequence[str],
        *,
        defenses: Iterable[DefenseAdapter] | None = None,
        response_selector: Callable[[str, random.Random], str] | None = None,
        rng: random.Random | None = None,
    ) -> None:
        self.knowledge_base = list(knowledge_base)
        self.canaries = list(canaries)
        self._rng = rng or random.Random()
        self._defenses = list(defenses or [])
        self._selector = response_selector or self._default_selector

    def _default_selector(self, prompt: str, rng: random.Random) -> str:
        lowered = prompt.lower()
        if any(trigger in lowered for trigger in ("secret", "leak", "canary")):
            return rng.choice(self.knowledge_base)
        return "No sensitive information available."

    def query(self, prompt: str, *, metadata: dict[str, object] | None = None) -> str:
        """Return a response to ``prompt`` after defenses have run."""

        response = self._selector(prompt, self._rng)
        context = {
            "prompt": prompt,
            "metadata": metadata or {},
            "canaries": self.canaries,
        }
        for defense in self._defenses:
            response = defense.process(response, context)
        return response

    @property
    def defenses(self) -> Sequence[DefenseAdapter]:
        """Tuple of defense adapters attached to the API."""

        return tuple(self._defenses)


class DefenseAdapter:
    """Protocol for implementing a mitigation strategy."""

    name: str = "defense"

    def process(
        self, response: str, context: dict[str, object]
    ) -> str:  # pragma: no cover - interface
        raise NotImplementedError
