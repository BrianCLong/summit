"""Base class for constraint plugins."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..context import ConstraintContext


class ConstraintPlugin(ABC):
    """Interface all constraint plugins must implement."""

    @abstractmethod
    def apply(self, context: ConstraintContext) -> None:
        """Mutate the problem with constraint expressions."""
        raise NotImplementedError
