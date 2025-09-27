"""Output helpers for PASLOG."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Mapping

import pyarrow as pa
import pyarrow.parquet as pq


def write_ndjson(path: str | Path, records: Iterable[Mapping[str, object]]) -> Path:
    """Write records to disk as newline-delimited JSON."""

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, default=str))
            handle.write("\n")
    return target


def write_parquet(path: str | Path, records: Iterable[Mapping[str, object]]) -> Path:
    """Write records to a Parquet file."""

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    record_list = list(records)
    if not record_list:
        raise ValueError("records must contain at least one row")
    table = pa.Table.from_pylist(record_list)
    pq.write_table(table, target)
    return target
