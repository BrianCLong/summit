"""Schema learning utilities for VSDF."""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd


@dataclass
class ColumnSchema:
    """Metadata describing a single column in a tabular dataset."""

    name: str
    kind: str
    categories: list[str] | None = None
    minimum: float | None = None
    maximum: float | None = None
    mean: float | None = None
    std: float | None = None


@dataclass
class TabularSchema:
    """Schema for a tabular dataset."""

    columns: dict[str, ColumnSchema]
    categorical_columns: list[str] = field(default_factory=list)
    numeric_columns: list[str] = field(default_factory=list)

    def select(self, columns: list[str]) -> TabularSchema:
        """Return a copy of the schema limited to the provided columns."""

        subset = {name: self.columns[name] for name in columns if name in self.columns}
        categorical = [c for c in self.categorical_columns if c in subset]
        numeric = [c for c in self.numeric_columns if c in subset]
        return TabularSchema(
            columns=subset, categorical_columns=categorical, numeric_columns=numeric
        )


class SchemaLearner:
    """Learns a :class:`TabularSchema` from a pandas ``DataFrame``."""

    def __init__(self, categorical_threshold: int = 20) -> None:
        self.categorical_threshold = categorical_threshold

    def learn(self, frame: pd.DataFrame) -> TabularSchema:
        """Infer schema metadata from the supplied frame."""

        columns: dict[str, ColumnSchema] = {}
        categorical_columns: list[str] = []
        numeric_columns: list[str] = []

        for column in frame.columns:
            series = frame[column]
            if pd.api.types.is_numeric_dtype(series):
                kind = "numeric"
            elif series.nunique(dropna=True) <= self.categorical_threshold:
                kind = "categorical"
            else:
                # Treat free-form strings as categorical with unique categories.
                kind = "categorical"

            if kind == "numeric":
                numeric_columns.append(column)
                numeric_data = series.dropna().astype(float)
                minimum = float(numeric_data.min()) if not numeric_data.empty else None
                maximum = float(numeric_data.max()) if not numeric_data.empty else None
                mean = float(numeric_data.mean()) if not numeric_data.empty else None
                std = float(numeric_data.std(ddof=0)) if not numeric_data.empty else None
                columns[column] = ColumnSchema(
                    name=column,
                    kind=kind,
                    minimum=minimum,
                    maximum=maximum,
                    mean=mean,
                    std=std,
                )
            else:
                categorical_columns.append(column)
                categories = series.dropna().astype(str).unique().tolist()
                columns[column] = ColumnSchema(
                    name=column,
                    kind=kind,
                    categories=categories,
                )

        return TabularSchema(
            columns=columns,
            categorical_columns=categorical_columns,
            numeric_columns=numeric_columns,
        )


def ensure_dataframe(obj: pd.DataFrame | dict[str, list]) -> pd.DataFrame:
    """Utility to coerce dictionaries to pandas ``DataFrame`` objects."""

    if isinstance(obj, pd.DataFrame):
        return obj.copy()

    return pd.DataFrame(obj)


__all__ = [
    "ColumnSchema",
    "SchemaLearner",
    "TabularSchema",
    "ensure_dataframe",
]
