"""Constraint representations and compiler for VSDF."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from .schema import TabularSchema, ensure_dataframe


@dataclass
class MarginalConstraint:
    """Represents a marginal distribution constraint for a single column."""

    column: str
    distribution: pd.Series
    tolerance: float = 0.05


@dataclass
class CorrelationConstraint:
    """Represents a pairwise correlation constraint between two numeric columns."""

    column_x: str
    column_y: str
    target: float
    tolerance: float = 0.05


@dataclass
class DenialConstraint:
    """Denial constraint encoded as a pandas ``DataFrame.query`` predicate."""

    predicate: str
    max_violations: float = 0.0


@dataclass
class ConstraintSet:
    """Container for all compiled constraints."""

    marginals: Dict[str, MarginalConstraint] = field(default_factory=dict)
    correlations: List[CorrelationConstraint] = field(default_factory=list)
    denial_constraints: List[DenialConstraint] = field(default_factory=list)
    numeric_stats: Dict[str, Dict[str, float]] = field(default_factory=dict)
    correlation_matrix: Optional[pd.DataFrame] = None
    dp_epsilon: float = 5.0


@dataclass
class ConstraintSpecification:
    """Specification describing which constraints to learn or enforce."""

    marginal_columns: Optional[Sequence[str]] = None
    correlation_pairs: Optional[Sequence[Tuple[str, str]]] = None
    denial_predicates: Optional[Sequence[str]] = None
    provided_marginals: Optional[Mapping[str, Mapping[str, float]]] = None
    provided_correlations: Optional[Sequence[Mapping[str, object]]] = None
    dp_epsilon: float = 5.0
    marginal_tolerance: float = 0.05
    correlation_tolerance: float = 0.05
    denial_tolerance: float = 0.0


class ConstraintCompiler:
    """Compiles user specifications and empirical measurements into constraints."""

    def __init__(self, schema: Optional[TabularSchema] = None) -> None:
        self.schema = schema

    def learn(
        self,
        frame: pd.DataFrame,
        specification: Optional[ConstraintSpecification] = None,
    ) -> ConstraintSet:
        """Learn constraints from the supplied frame and specification."""

        specification = specification or ConstraintSpecification()
        schema = self.schema or self._learn_schema(frame)
        constraint_set = ConstraintSet(dp_epsilon=specification.dp_epsilon)

        self._compile_marginals(frame, schema, specification, constraint_set)
        self._compile_correlations(frame, schema, specification, constraint_set)
        self._compile_denials(specification, constraint_set)

        return constraint_set

    def compile_from_specs(
        self,
        specification: ConstraintSpecification,
        frame: Optional[pd.DataFrame] = None,
    ) -> ConstraintSet:
        """Compile constraints from explicitly provided specifications."""

        if frame is None and self.schema is None:
            raise ValueError("Either a schema or a reference frame must be supplied.")

        schema = self.schema or self._learn_schema(frame or ensure_dataframe({}))
        constraint_set = ConstraintSet(dp_epsilon=specification.dp_epsilon)

        if specification.provided_marginals:
            for column, distribution in specification.provided_marginals.items():
                series = pd.Series(distribution, dtype=float)
                series /= series.sum()
                constraint_set.marginals[column] = MarginalConstraint(
                    column=column,
                    distribution=series,
                    tolerance=specification.marginal_tolerance,
                )

        if specification.provided_correlations:
            for payload in specification.provided_correlations:
                column_x = str(payload["column_x"])
                column_y = str(payload["column_y"])
                target = float(payload["value"])
                constraint_set.correlations.append(
                    CorrelationConstraint(
                        column_x=column_x,
                        column_y=column_y,
                        target=target,
                        tolerance=specification.correlation_tolerance,
                    )
                )

        numeric_stats: Dict[str, Dict[str, float]] = {}
        for name in schema.numeric_columns:
            stats = schema.columns[name]
            numeric_stats[name] = {
                "mean": stats.mean if stats.mean is not None else 0.0,
                "std": stats.std if stats.std is not None else 0.0,
            }
        constraint_set.numeric_stats = numeric_stats
        constraint_set.correlation_matrix = self._build_correlation_matrix(
            schema.numeric_columns,
            constraint_set.correlations,
        )

        self._compile_denials(specification, constraint_set)
        return constraint_set

    def _learn_schema(self, frame: pd.DataFrame) -> TabularSchema:
        from .schema import SchemaLearner

        learner = SchemaLearner()
        schema = learner.learn(frame)
        self.schema = schema
        return schema

    def _compile_marginals(
        self,
        frame: pd.DataFrame,
        schema: TabularSchema,
        specification: ConstraintSpecification,
        constraint_set: ConstraintSet,
    ) -> None:
        columns = specification.marginal_columns or schema.categorical_columns
        for column in columns:
            if column not in frame.columns:
                continue
            counts = frame[column].astype(str).value_counts(dropna=False)
            distribution = counts / counts.sum()
            constraint_set.marginals[column] = MarginalConstraint(
                column=column,
                distribution=distribution,
                tolerance=specification.marginal_tolerance,
            )

    def _compile_correlations(
        self,
        frame: pd.DataFrame,
        schema: TabularSchema,
        specification: ConstraintSpecification,
        constraint_set: ConstraintSet,
    ) -> None:
        numeric_columns = schema.numeric_columns
        numeric_stats: Dict[str, Dict[str, float]] = {}

        if not numeric_columns:
            constraint_set.numeric_stats = {}
            constraint_set.correlation_matrix = None
            return

        numeric_frame = frame[numeric_columns].astype(float)
        for name in numeric_columns:
            series = numeric_frame[name].dropna()
            numeric_stats[name] = {
                "mean": float(series.mean()) if not series.empty else 0.0,
                "std": float(series.std(ddof=0)) if not series.empty else 0.0,
            }

        correlation_pairs = specification.correlation_pairs
        correlations: List[CorrelationConstraint] = []
        matrix = numeric_frame.corr().fillna(0.0)

        if correlation_pairs:
            for column_x, column_y in correlation_pairs:
                if column_x not in matrix.columns or column_y not in matrix.columns:
                    continue
                correlations.append(
                    CorrelationConstraint(
                        column_x=column_x,
                        column_y=column_y,
                        target=float(matrix.loc[column_x, column_y]),
                        tolerance=specification.correlation_tolerance,
                    )
                )
        else:
            for column_x in matrix.columns:
                for column_y in matrix.columns:
                    if column_x >= column_y:
                        continue
                    correlations.append(
                        CorrelationConstraint(
                            column_x=column_x,
                            column_y=column_y,
                            target=float(matrix.loc[column_x, column_y]),
                            tolerance=specification.correlation_tolerance,
                        )
                    )

        constraint_set.correlations = correlations
        constraint_set.numeric_stats = numeric_stats
        constraint_set.correlation_matrix = matrix

    def _compile_denials(
        self,
        specification: ConstraintSpecification,
        constraint_set: ConstraintSet,
    ) -> None:
        predicates = specification.denial_predicates or []
        for predicate in predicates:
            constraint_set.denial_constraints.append(
                DenialConstraint(
                    predicate=predicate,
                    max_violations=specification.denial_tolerance,
                )
            )

    def _build_correlation_matrix(
        self,
        numeric_columns: Sequence[str],
        correlations: Iterable[CorrelationConstraint],
    ) -> Optional[pd.DataFrame]:
        if not numeric_columns:
            return None

        matrix = pd.DataFrame(
            np.eye(len(numeric_columns)),
            index=numeric_columns,
            columns=numeric_columns,
        )
        for constraint in correlations:
            if constraint.column_x in matrix.index and constraint.column_y in matrix.columns:
                matrix.loc[constraint.column_x, constraint.column_y] = constraint.target
                matrix.loc[constraint.column_y, constraint.column_x] = constraint.target
        return matrix


__all__ = [
    "ConstraintCompiler",
    "ConstraintSet",
    "ConstraintSpecification",
    "CorrelationConstraint",
    "DenialConstraint",
    "MarginalConstraint",
]
