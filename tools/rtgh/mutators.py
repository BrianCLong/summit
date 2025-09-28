"""Constraint-aware mutation helpers."""

from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List

from .grammar import RandomLike


MutatorFunc = Callable[[Any, RandomLike], Any]


@dataclass
class ConstraintMutator:
    """Encapsulates a mutation that respects pre-conditions."""

    name: str
    mutate: MutatorFunc
    condition: Callable[[Any], bool] | None = None

    def __call__(self, payload: Any, rng: RandomLike) -> Any:
        candidate = copy.deepcopy(payload)
        if self.condition and not self.condition(candidate):
            return candidate
        return self.mutate(candidate, rng)


@dataclass
class ProbabilityMutator(ConstraintMutator):
    """Constraint mutator that fires based on a probability threshold."""

    probability: float = 0.5

    def __call__(self, payload: Any, rng: RandomLike) -> Any:  # type: ignore[override]
        candidate = copy.deepcopy(payload)
        if self.condition and not self.condition(candidate):
            return candidate
        if rng.random() <= self.probability:
            return self.mutate(candidate, rng)
        return candidate


def field_flip_mutator(field: str, choices: Iterable[Any], name: str | None = None) -> ProbabilityMutator:
    def _mutate(payload: Dict[str, Any], rng: RandomLike) -> Dict[str, Any]:
        payload[field] = rng.choice(list(choices))
        return payload

    return ProbabilityMutator(name=name or f"flip-{field}", mutate=_mutate)


def inject_flag_mutator(field: str, value: Any, name: str | None = None) -> ProbabilityMutator:
    def _mutate(payload: Dict[str, Any], rng: RandomLike) -> Dict[str, Any]:
        payload[field] = value
        return payload

    return ProbabilityMutator(name=name or f"inject-{field}", mutate=_mutate)


__all__ = [
    "ConstraintMutator",
    "ProbabilityMutator",
    "field_flip_mutator",
    "inject_flag_mutator",
]
