"""Registry for built-in constraint plugins."""

from __future__ import annotations

from typing import ClassVar, Dict, List


class ConstraintRegistry:
    """Stores built-in constraint plugin paths."""

    _registry: ClassVar[Dict[str, str]] = {}
    _default_order: ClassVar[List[str]] = []

    @classmethod
    def register(cls, name: str, dotted_path: str) -> None:
        cls._registry[name] = dotted_path
        if name not in cls._default_order:
            cls._default_order.append(name)

    @classmethod
    def default_paths(cls) -> List[str]:
        return [cls._registry[name] for name in cls._default_order]


__all__ = ["ConstraintRegistry"]
