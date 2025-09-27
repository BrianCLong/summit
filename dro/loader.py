"""Constraint loader for DRO."""

from __future__ import annotations

from importlib import import_module
from typing import Iterable, List, Sequence, Type

from .constraints.base import ConstraintPlugin
from .constraints.registry import ConstraintRegistry
from .context import ConstraintContext


class ConstraintLoader:
    """Loads and applies configured constraint plugins."""

    def __init__(self, constraint_paths: Sequence[str] | None = None) -> None:
        self.constraint_paths = list(constraint_paths or ConstraintRegistry.default_paths())

    def _resolve_plugin(self, dotted_path: str) -> ConstraintPlugin:
        module_name, class_name = dotted_path.rsplit(".", 1)
        module = import_module(module_name)
        cls = getattr(module, class_name)
        if not issubclass(cls, ConstraintPlugin):  # type: ignore[arg-type]
            raise TypeError(f"{dotted_path} is not a ConstraintPlugin")
        return cls()

    def load_plugins(self) -> List[ConstraintPlugin]:
        return [self._resolve_plugin(path) for path in self.constraint_paths]

    def apply(self, context: ConstraintContext) -> None:
        for plugin in self.load_plugins():
            plugin.apply(context)
