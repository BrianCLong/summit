"""Constraint-aware synthetic data sampler."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from .constraints import ConstraintSet, MarginalConstraint
from .schema import TabularSchema


@dataclass
class SamplerConfig:
    """Configuration for the :class:`ConstraintDrivenSampler`."""

    max_denial_attempts: int = 5


class ConstraintDrivenSampler:
    """Generate synthetic data satisfying compiled constraints."""

    def __init__(
        self,
        schema: TabularSchema,
        constraints: ConstraintSet,
        config: Optional[SamplerConfig] = None,
        random_state: Optional[int] = None,
    ) -> None:
        self.schema = schema
        self.constraints = constraints
        self.config = config or SamplerConfig()
        self.rng = np.random.default_rng(random_state)
        self._dp_scale = 1.0 / max(constraints.dp_epsilon, 1e-6)

    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate a synthetic dataset of ``num_rows`` rows."""

        base = self._generate_base_batch(num_rows)
        if not self.constraints.denial_constraints:
            return base.reset_index(drop=True)

        result = base
        attempts = 0
        while attempts < self.config.max_denial_attempts:
            filtered, satisfied = self._filter_denials(result)
            if len(filtered) >= num_rows:
                return filtered.iloc[:num_rows].reset_index(drop=True)

            deficit = num_rows - len(filtered)
            if deficit <= 0:
                break

            replenishment = self._generate_base_batch(deficit)
            result = pd.concat([filtered, replenishment], ignore_index=True)
            attempts += 1

        # Fall back to truncating the best-effort result.
        filtered, _ = self._filter_denials(result)
        return filtered.iloc[:num_rows].reset_index(drop=True)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _generate_base_batch(self, num_rows: int) -> pd.DataFrame:
        numeric = self._sample_numeric(num_rows)
        categorical = self._sample_categorical(num_rows)
        columns: Dict[str, pd.Series] = {}

        if numeric is not None:
            for column, series in numeric.items():
                columns[column] = series
        if categorical is not None:
            for column, series in categorical.items():
                columns[column] = series

        frame = pd.DataFrame(columns)
        # Ensure original column order.
        ordered_columns = [col for col in self.schema.columns.keys() if col in frame.columns]
        return frame[ordered_columns]

    def _sample_numeric(self, num_rows: int) -> Optional[pd.DataFrame]:
        numeric_columns = self.schema.numeric_columns
        if not numeric_columns:
            return None

        stats = self.constraints.numeric_stats
        means: List[float] = []
        stds: List[float] = []
        for column in numeric_columns:
            column_stats = stats.get(column, {"mean": 0.0, "std": 1.0})
            mean = float(column_stats.get("mean", 0.0))
            std = float(column_stats.get("std", 0.0))
            noisy_mean = mean + self.rng.laplace(0.0, self._dp_scale)
            noisy_std = max(std + self.rng.laplace(0.0, self._dp_scale), 1e-6)
            means.append(noisy_mean)
            stds.append(noisy_std)

        correlation_matrix = self.constraints.correlation_matrix
        if correlation_matrix is not None:
            matrix = correlation_matrix.loc[numeric_columns, numeric_columns].to_numpy(copy=True)
            matrix = self._nearest_positive_semidefinite(matrix)
        else:
            matrix = np.eye(len(numeric_columns))

        covariance = matrix * np.outer(stds, stds)
        try:
            samples = self.rng.multivariate_normal(means, covariance, size=num_rows)
        except np.linalg.LinAlgError:
            jitter = np.eye(len(numeric_columns)) * 1e-6
            samples = self.rng.multivariate_normal(means, covariance + jitter, size=num_rows)

        numeric_frame = pd.DataFrame(samples, columns=numeric_columns)

        # Clip numeric values to observed ranges if available.
        for column in numeric_columns:
            column_schema = self.schema.columns[column]
            if column_schema.minimum is not None:
                numeric_frame[column] = numeric_frame[column].clip(lower=column_schema.minimum)
            if column_schema.maximum is not None:
                numeric_frame[column] = numeric_frame[column].clip(upper=column_schema.maximum)

        return numeric_frame

    def _sample_categorical(self, num_rows: int) -> Optional[pd.DataFrame]:
        categorical_columns = self.schema.categorical_columns
        if not categorical_columns:
            return None

        series_dict: Dict[str, pd.Series] = {}
        for column in categorical_columns:
            constraint = self.constraints.marginals.get(column)
            if constraint is None:
                series_dict[column] = self._sample_uniform_categorical(column, num_rows)
            else:
                series_dict[column] = self._sample_categorical_column(constraint, num_rows)

        if not series_dict:
            return None

        return pd.DataFrame(series_dict)

    def _sample_categorical_column(self, constraint: MarginalConstraint, num_rows: int) -> pd.Series:
        distribution = constraint.distribution.astype(float)
        distribution = distribution / distribution.sum()
        counts = distribution * num_rows
        noisy_counts = counts + self.rng.laplace(0.0, self._dp_scale, size=len(counts))
        noisy_counts = np.clip(noisy_counts, 0.0, None)
        if noisy_counts.sum() == 0:
            probabilities = np.ones(len(counts)) / len(counts)
        else:
            probabilities = noisy_counts / noisy_counts.sum()
        categories = distribution.index.to_list()
        sampled = self.rng.choice(categories, size=num_rows, p=probabilities)
        return pd.Series(sampled, dtype="object")

    def _sample_uniform_categorical(self, column: str, num_rows: int) -> pd.Series:
        schema_column = self.schema.columns.get(column)
        categories = schema_column.categories if schema_column else None
        if not categories:
            categories = ["missing"]
        probabilities = np.ones(len(categories)) / len(categories)
        sampled = self.rng.choice(categories, size=num_rows, p=probabilities)
        return pd.Series(sampled, dtype="object")

    def _filter_denials(self, frame: pd.DataFrame) -> tuple[pd.DataFrame, Dict[str, float]]:
        if not self.constraints.denial_constraints:
            return frame, {}

        filtered = frame.copy()
        violation_rates: Dict[str, float] = {}
        for constraint in self.constraints.denial_constraints:
            try:
                mask = filtered.eval(constraint.predicate)
            except Exception:
                mask = pd.Series(False, index=filtered.index)
            violation_rate = mask.mean() if len(mask) else 0.0
            violation_rates[constraint.predicate] = float(violation_rate)
            if violation_rate > constraint.max_violations:
                filtered = filtered.loc[~mask].reset_index(drop=True)
        return filtered, violation_rates

    def _nearest_positive_semidefinite(self, matrix: np.ndarray) -> np.ndarray:
        """Project the supplied matrix to the nearest positive semidefinite matrix."""

        symmetric = (matrix + matrix.T) / 2.0
        eigenvalues, eigenvectors = np.linalg.eigh(symmetric)
        clipped = np.clip(eigenvalues, 1e-6, None)
        return (eigenvectors @ np.diag(clipped) @ eigenvectors.T).astype(float)


__all__ = [
    "ConstraintDrivenSampler",
    "SamplerConfig",
]
