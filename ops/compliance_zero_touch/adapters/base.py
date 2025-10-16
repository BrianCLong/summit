"""Policy adapters for bridging to external policy-as-code engines."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
from pathlib import Path

from ..models.base import PolicyEvaluationResult


class PolicyAdapter(ABC):
    """Base class for policy-as-code adapters."""

    name: str

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def evaluate(self, workspace: Path) -> PolicyEvaluationResult:
        """Run the adapter on provided workspace material."""

    def discover_material(self, workspace: Path, patterns: Iterable[str]) -> list[Path]:
        """Locate files within a workspace matching provided glob patterns."""

        matches: list[Path] = []
        for pattern in patterns:
            matches.extend(workspace.rglob(pattern))
        return matches
