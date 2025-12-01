"""Dask-powered data preprocessing pipeline for PostgreSQL sources.

This module introduces a parallel preprocessing workflow that fetches
records from PostgreSQL, normalises numeric features, derives aggregate
features and performs anomaly detection.  Execution time for each stage is
captured with OpenTelemetry spans so downstream services (such as the ingest
wizard from PR #1368) can surface quality insights.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Callable, Dict, Iterable, MutableMapping, Sequence

import dask.dataframe as dd
import numpy as np
import pandas as pd
from opentelemetry import trace
from opentelemetry.trace import Tracer
from sklearn.ensemble import IsolationForest
from sqlalchemy import create_engine

TracerFactory = Callable[[str], Tracer]


@dataclass
class PreprocessingResult:
    """Container for the enriched dataset and derived insights."""

    dataframe: dd.DataFrame
    quality_insights: Dict[str, Any]


@dataclass
class PostgresPreprocessingPipeline:
    """End-to-end preprocessing pipeline for PostgreSQL-backed datasets.

    Parameters
    ----------
    connection_uri:
        SQLAlchemy-compatible URI pointing to the PostgreSQL instance.
    table:
        Optional table name.  When provided ``index_column`` must be set so
        Dask can partition the query.  Mutually exclusive with ``query``.
    query:
        Explicit SQL query.  Useful when complex joins or filters are
        required.  When supplied the result set is loaded into a Pandas
        DataFrame and then distributed across Dask partitions.
    index_column:
        Column used for partitioning when ``table`` is specified.
    npartitions:
        Desired number of Dask partitions.  Defaults to 4 which is a good
        balance for tests yet scales with larger datasets.
    feature_columns:
        Columns to use during anomaly detection.  Falls back to all numeric
        columns when omitted.
    tracer_factory:
        Optional callable returning an OpenTelemetry tracer.  When omitted the
        default tracer provider is used.
    data_loader:
        Injection point primarily used by tests to bypass the actual database
        connection and supply a ready-made Dask dataframe.
    """

    connection_uri: str
    table: str | None = None
    query: str | None = None
    index_column: str | None = None
    npartitions: int = 4
    feature_columns: Sequence[str] | None = None
    tracer_factory: TracerFactory | None = None
    data_loader: Callable[[], dd.DataFrame] | None = None
    _timings_ms: MutableMapping[str, float] = field(default_factory=dict, init=False)

    def __post_init__(self) -> None:
        if self.table and self.query:
            raise ValueError("Only one of 'table' or 'query' can be provided")
        if self.table and not self.index_column:
            raise ValueError("'index_column' is required when using 'table'")
        if self.tracer_factory is None:
            tracer_provider = trace.get_tracer_provider()
            self._tracer = tracer_provider.get_tracer(__name__)
        else:
            self._tracer = self.tracer_factory(__name__)

    @contextmanager
    def _timed_span(self, name: str):
        with self._tracer.start_as_current_span(name) as span:
            start = perf_counter()
            try:
                yield span
            finally:
                duration = (perf_counter() - start) * 1000.0
                span.set_attribute("ml.preprocessing.duration_ms", duration)
                self._timings_ms[name] = duration

    def _load_from_postgres(self) -> dd.DataFrame:
        engine = create_engine(self.connection_uri)
        if self.table:
            assert self.index_column is not None  # guarded in __post_init__
            return dd.read_sql_table(
                table=self.table,
                uri=self.connection_uri,
                index_col=self.index_column,
                npartitions=self.npartitions,
            )
        if not self.query:
            raise ValueError("Either 'table' or 'query' must be provided")
        pdf = pd.read_sql_query(self.query, con=engine)
        return dd.from_pandas(pdf, npartitions=self.npartitions)

    def _load(self) -> dd.DataFrame:
        with self._timed_span("load_data"):
            if self.data_loader is not None:
                return self.data_loader()
            return self._load_from_postgres()

    def _normalise(self, frame: dd.DataFrame) -> tuple[dd.DataFrame, pd.DataFrame]:
        with self._timed_span("normalise"):
            numeric_columns = frame.select_dtypes(include=["number"]).columns.tolist()
            if not numeric_columns:
                return frame, pd.DataFrame()

            stats = frame[numeric_columns].describe().compute()
            means = stats.loc["mean"].astype(float)
            stds = stats.loc["std"].replace(0, 1).astype(float)

            def _normalise_partition(partition: pd.DataFrame) -> pd.DataFrame:
                if not numeric_columns:
                    return partition
                normalised = partition.copy()
                normalised[numeric_columns] = (normalised[numeric_columns] - means) / stds
                return normalised

            normalised_frame = frame.map_partitions(_normalise_partition, meta=frame._meta)
            return normalised_frame, stats

    def _extract_features(
        self, frame: dd.DataFrame, numeric_columns: Iterable[str]
    ) -> dd.DataFrame:
        with self._timed_span("feature_extraction"):
            numeric_columns = list(numeric_columns)
            if not numeric_columns:
                return frame

            def _add_features(partition: pd.DataFrame) -> pd.DataFrame:
                augmented = partition.copy()
                numeric_part = augmented[numeric_columns]
                augmented["feature_sum"] = numeric_part.sum(axis=1)
                augmented["feature_mean"] = numeric_part.mean(axis=1)
                augmented["feature_std"] = numeric_part.std(axis=1).fillna(0.0)
                augmented["feature_l2_norm"] = np.linalg.norm(numeric_part, axis=1)
                return augmented

            return frame.map_partitions(_add_features, meta=frame._meta.assign(
                feature_sum=np.float64(),
                feature_mean=np.float64(),
                feature_std=np.float64(),
                feature_l2_norm=np.float64(),
            ))

    def _detect_anomalies(
        self,
        frame: dd.DataFrame,
        feature_columns: Sequence[str],
    ) -> tuple[dd.DataFrame, Dict[str, Any]]:
        with self._timed_span("anomaly_detection"):
            row_count = int(frame.index.size.compute())
            if not feature_columns:
                return frame, {"anomalyRate": 0.0, "total": row_count, "anomalies": 0}

            features = frame[list(feature_columns)].compute()
            if features.empty:
                return frame, {"anomalyRate": 0.0, "total": row_count, "anomalies": 0}

            model = IsolationForest(contamination=0.05, random_state=42)
            predictions = model.fit_predict(features)
            scores = model.decision_function(features)
            anomalies = pd.DataFrame(
                {
                    "anomaly_flag": predictions,
                    "anomaly_score": scores,
                },
                index=features.index,
            )

            anomalies_dd = dd.from_pandas(anomalies, npartitions=frame.npartitions)
            augmented = frame.join(anomalies_dd)

            anomaly_rate = float((predictions == -1).sum() / len(predictions))
            return augmented, {
                "anomalyRate": anomaly_rate,
                "total": int(len(predictions)),
                "anomalies": int((predictions == -1).sum()),
            }

    def run(self) -> PreprocessingResult:
        """Execute the preprocessing workflow and return the enriched data."""

        frame = self._load()
        normalised_frame, stats = self._normalise(frame)
        numeric_columns = normalised_frame.select_dtypes(include=["number"]).columns.tolist()
        feature_frame = self._extract_features(normalised_frame, numeric_columns)

        if self.feature_columns:
            feature_columns = list(self.feature_columns)
        else:
            feature_columns = [
                col
                for col in feature_frame.columns
                if col in {"feature_sum", "feature_mean", "feature_std", "feature_l2_norm"}
                or feature_frame[col].dtype.kind in {"i", "f"}
            ]

        augmented_frame, anomaly_summary = self._detect_anomalies(feature_frame, feature_columns)

        feature_stats: Dict[str, Dict[str, float]] = {}
        if not stats.empty:
            for column in stats.columns:
                feature_stats[column] = {
                    metric: float(stats.loc[metric, column])
                    for metric in ("mean", "std", "min", "max")
                    if metric in stats.index
                }

        quality_insights = {
            "timingsMs": dict(self._timings_ms),
            "featureStats": feature_stats,
            "anomalySummary": anomaly_summary,
        }
        return PreprocessingResult(dataframe=augmented_frame, quality_insights=quality_insights)
