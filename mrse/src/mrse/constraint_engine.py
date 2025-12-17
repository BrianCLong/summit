from __future__ import annotations

from typing import Callable, Iterable, List

from .world_state import WorldState


class ConstraintEngine:
    """Aggregates invariant and constraint checks for simulated futures."""

    def __init__(self, extra_checks: Iterable[Callable[[WorldState], bool]] | None = None):
        self.extra_checks: List[Callable[[WorldState], bool]] = list(extra_checks or [])

    def validate(self, state: WorldState) -> bool:
        checks = list(state.invariants) + list(state.constraints) + self.extra_checks
        return all(check(state) for check in checks) if checks else True
