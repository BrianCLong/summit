"""Streaming utilities to keep memory usage predictable for large datasets."""

from __future__ import annotations

from typing import Iterable, Iterator, List, Sequence

try:  # pragma: no cover - optional dependency
    import pandas as pd
except Exception:  # pragma: no cover - fallback when pandas unavailable
    pd = None  # type: ignore


def stream_iterable(values: Iterable[object], *, chunk_size: int = 1000) -> Iterator[List[object]]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    batch: List[object] = []
    for value in values:
        batch.append(value)
        if len(batch) >= chunk_size:
            yield batch
            batch = []
    if batch:
        yield batch


def stream_dataframe(df: "pd.DataFrame", *, chunk_size: int = 1000) -> Iterator[Sequence[object]]:
    if pd is None:
        raise RuntimeError("pandas is required for dataframe streaming")
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    total = len(df)
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total)
        yield tuple(df.iloc[start:end].itertuples(index=False, name=None))
