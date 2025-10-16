from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class Record:
    """Data record loaded from a dataset."""

    index: int
    values: dict[str, Any]

    def metric(self, column: str) -> float:
        value = self.values.get(column)
        if value is None:
            raise KeyError(f"Metric column '{column}' missing for record {self.index}")
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Metric column '{column}' must be numeric (record {self.index})"
            ) from exc


@dataclass
class SamplingProof:
    seed: int
    rng_state_hash: str
    inclusion_probabilities: dict[int, float]


def hash_rng_state(state: Sequence[Any]) -> str:
    """Hash an RNG state tuple for compact inclusion in proofs."""

    state_bytes = json.dumps(state, default=str).encode("utf-8")
    return hashlib.sha256(state_bytes).hexdigest()


def load_json_or_yaml(path: Path) -> dict[str, Any]:
    """Load configuration from JSON or YAML without requiring PyYAML."""

    text = path.read_text()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ModuleNotFoundError as exc:
            raise ValueError("Configuration is not valid JSON and PyYAML is not installed") from exc
        return yaml.safe_load(text)


def load_dataset(path: Path) -> list[Record]:
    """Load a CSV dataset into a list of :class:`Record` objects."""

    import csv

    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        records: list[Record] = []
        for idx, row in enumerate(reader):
            records.append(Record(index=idx, values=row))
    if not records:
        raise ValueError("Dataset is empty; sampling requires at least one record")
    return records


def group_by(records: Iterable[Record], keys: Sequence[str]) -> dict[str, list[Record]]:
    """Group records by concatenated key values."""

    groups: dict[str, list[Record]] = {}
    for record in records:
        if not keys:
            groups.setdefault("__all__", []).append(record)
            continue
        group_key = "|".join(str(record.values.get(k, "__missing__")) for k in keys)
        groups.setdefault(group_key, []).append(record)
    return groups
