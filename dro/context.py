"""Constraint context definitions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from pulp import LpProblem, LpVariable

from .models import OptimizationSpec


DecisionVarKey = Tuple[str, str]


@dataclass(slots=True)
class ConstraintContext:
    """Provides constraint plugins with access to the optimization problem."""

    problem: LpProblem
    decision_vars: Dict[DecisionVarKey, LpVariable]
    spec: OptimizationSpec

    def dataset_region_var(self, dataset_id: str, region_id: str) -> LpVariable:
        return self.decision_vars[(dataset_id, region_id)]
