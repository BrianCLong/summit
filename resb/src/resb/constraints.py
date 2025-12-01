"""Constraint helpers for RESB."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Protocol

import pandas as pd


class DenialConstraint(Protocol):
    """Callable that returns ``True`` when the candidate is valid."""

    name: str

    def __call__(self, candidate: pd.Series) -> bool:
        ...


@dataclass(frozen=True)
class FunctionalConstraint:
    """Wraps a callable constraint with a friendly ``repr``."""

    name: str
    predicate: Callable[[pd.Series], bool]

    def __call__(self, candidate: pd.Series) -> bool:  # pragma: no cover - trivial
        return bool(self.predicate(candidate))


def GreaterEqualConstraint(column: str, threshold: float) -> FunctionalConstraint:
    """Ensure ``column`` is greater than or equal to ``threshold``."""

    return FunctionalConstraint(
        name=f"{column}_ge_{threshold}",
        predicate=lambda row: row[column] >= threshold,
    )


def LessEqualConstraint(column: str, threshold: float) -> FunctionalConstraint:
    """Ensure ``column`` is less than or equal to ``threshold"""

    return FunctionalConstraint(
        name=f"{column}_le_{threshold}",
        predicate=lambda row: row[column] <= threshold,
    )


def RangeConstraint(column: str, lower: float, upper: float) -> FunctionalConstraint:
    """Ensure ``column`` lies within a closed interval."""

    if lower > upper:
        raise ValueError("lower bound must be <= upper bound")
    return FunctionalConstraint(
        name=f"{column}_range_{lower}_{upper}",
        predicate=lambda row: lower <= row[column] <= upper,
    )


def check_constraints(constraints: Iterable[DenialConstraint], candidate: pd.Series) -> bool:
    """Return ``True`` if all constraints are satisfied."""

    for constraint in constraints:
        if not constraint(candidate):
            return False
    return True
