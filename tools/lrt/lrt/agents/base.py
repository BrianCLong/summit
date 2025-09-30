"""Base classes for red-team agents."""
from __future__ import annotations

import abc
import random
from typing import Iterable

from ..api import AttackSession, ProtectedAPI


class AttackAgent(abc.ABC):
    """Abstract attacker that interacts with :class:`ProtectedAPI`."""

    name: str

    def __init__(self, seed: int) -> None:
        self.seed = seed
        self._rng = random.Random(seed)

    @abc.abstractmethod
    def run(self, api: ProtectedAPI, session: AttackSession) -> None:
        """Execute an attack. Implementations should populate ``session``."""

    def _tick(self, counter: int) -> float:
        """Provide a deterministic timestamp for reproducibility."""
        return float(counter)


class SequentialAgent(AttackAgent):
    """Helper for agents that issue a fixed sequence of prompts."""

    prompts: Iterable[str]

    def run(self, api: ProtectedAPI, session: AttackSession) -> None:  # pragma: no cover - template
        raise NotImplementedError
