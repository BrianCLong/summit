"""Core fingerprint primitives for the tabular perceptual fingerprinting registry."""

from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Any, Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Tuple

BITS = 64
DEFAULT_MINHASH_PERMUTATIONS = 128


@dataclass(frozen=True)
class ColumnSketch:
    """Compact summary of a column suitable for similarity comparison."""

    name: str
    dtype: str
    simhash: int
    density: float
    mean: Optional[float]
    deviation: Optional[float]
    cardinality: int

    def similarity(self, other: "ColumnSketch") -> float:
        if self.name != other.name:
            return 0.0
        if not self.simhash and not other.simhash:
            simhash_sim = 1.0
        else:
            simhash_sim = 1.0 - hamming_distance(self.simhash, other.simhash, BITS) / BITS
        if self.dtype == other.dtype == "numeric" and self.mean is not None and other.mean is not None:
            denom = max(abs(self.mean), abs(other.mean), 1.0)
            mean_sim = 1.0 - min(abs(self.mean - other.mean) / denom, 1.0)
            dev_a = self.deviation or 0.0
            dev_b = other.deviation or 0.0
            denom_dev = max(dev_a, dev_b, 1.0)
            dev_sim = 1.0 - min(abs(dev_a - dev_b) / denom_dev, 1.0)
            stat_sim = 0.5 * mean_sim + 0.5 * dev_sim
        else:
            stat_sim = 1.0 - min(abs(self.density - other.density), 1.0)
        return 0.6 * simhash_sim + 0.4 * stat_sim


@dataclass(frozen=True)
class TableFingerprint:
    """Composite perceptual fingerprint for a table."""

    columns: Dict[str, ColumnSketch]
    schema_signature: str
    minhash_signature: Tuple[int, ...]
    num_rows: int

    @property
    def column_names(self) -> List[str]:
        return sorted(self.columns.keys())


class TableFingerprintBuilder:
    """Construct fingerprints from various table-like inputs."""

    def __init__(self, num_permutations: int = DEFAULT_MINHASH_PERMUTATIONS) -> None:
        self._minhasher = MinHasher(num_permutations=num_permutations)

    def build(self, table: Any) -> TableFingerprint:
        records = list(iter_records(table))
        columns = sorted({key for row in records for key in row.keys()})
        column_values: Dict[str, List[str]] = {col: [] for col in columns}
        numeric_values: Dict[str, List[float]] = defaultdict(list)
        for row in records:
            for column in columns:
                raw_value = row.get(column)
                canonical = canonicalize_value(raw_value)
                column_values[column].append(canonical)
                numeric_value = coerce_numeric(raw_value)
                if numeric_value is not None:
                    numeric_values[column].append(numeric_value)
        column_sketches: Dict[str, ColumnSketch] = {}
        for column in columns:
            values = column_values[column]
            dtype = infer_dtype(values, numeric_values[column])
            simhash_value = simhash(values)
            unique_ratio = unique_density(values)
            if dtype == "numeric" and numeric_values[column]:
                mean_value = mean(numeric_values[column])
                deviation = pstdev(numeric_values[column]) if len(numeric_values[column]) > 1 else 0.0
            else:
                mean_value = None
                deviation = None
            column_sketches[column] = ColumnSketch(
                name=column,
                dtype=dtype,
                simhash=simhash_value,
                density=unique_ratio,
                mean=mean_value,
                deviation=deviation,
                cardinality=len(values),
            )
        schema_signature = hash_list(
            [f"{column}:{column_sketches[column].dtype}" for column in columns]
        )
        minhash_signature = self._minhasher.signature(iter_table_tokens(column_values))
        return TableFingerprint(
            columns=column_sketches,
            schema_signature=schema_signature,
            minhash_signature=minhash_signature,
            num_rows=len(records),
        )


def iter_records(table: Any) -> Iterator[Mapping[str, Any]]:
    if hasattr(table, "to_dict"):
        try:
            data = table.to_dict(orient="records")  # type: ignore[arg-type]
        except TypeError:
            data = table.to_dict()  # type: ignore[assignment]
            if isinstance(data, Mapping):
                return iter_records_from_mapping(data)
            return iter(data)
        return (normalize_record(record) for record in data)  # type: ignore[arg-type]
    if isinstance(table, Mapping):
        return iter_records_from_mapping(table)
    return (normalize_record(record) for record in table)


def iter_records_from_mapping(table: Mapping[str, Sequence[Any]]) -> Iterator[Mapping[str, Any]]:
    columns = list(table.keys())
    lengths = [len(table[column]) for column in columns]
    length = max(lengths, default=0)
    for index in range(length):
        yield {
            column: table[column][index] if index < len(table[column]) else None for column in columns
        }


def normalize_record(record: Mapping[str, Any]) -> Mapping[str, Any]:
    return dict(record)


def canonicalize_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, bool)):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return ""
        return f"{round(value, 4):.4f}"
    text = str(value).strip().lower()
    return " ".join(text.split())


def coerce_numeric(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def infer_dtype(values: Sequence[str], numeric_values: Sequence[float]) -> str:
    non_empty = [value for value in values if value]
    if numeric_values and len(numeric_values) >= max(1, len(non_empty) // 2):
        return "numeric"
    unique_tokens = {token for value in non_empty for token in tokenise(value)}
    if unique_tokens and all(token.isalpha() for token in unique_tokens):
        return "text"
    return "mixed"


def unique_density(values: Sequence[str]) -> float:
    filtered = [value for value in values if value]
    if not filtered:
        return 0.0
    unique = len(set(filtered))
    return unique / len(filtered)


def iter_table_tokens(columns: Mapping[str, Sequence[str]]) -> Iterator[str]:
    for column, values in columns.items():
        for value in values:
            if not value:
                continue
            for token in tokenise(value):
                yield f"{column}:{token}"


def tokenise(value: str, ngram: int = 3) -> Iterable[str]:
    if not value:
        return []
    padded = f"__{value}__"
    if len(padded) <= ngram:
        return [padded]
    return {padded[index : index + ngram] for index in range(len(padded) - ngram + 1)}


def simhash(values: Sequence[str], bits: int = BITS) -> int:
    vector = [0] * bits
    for value in values:
        if not value:
            continue
        for token in tokenise(value):
            hashed = hash_token(token)
            for index in range(bits):
                bit = (hashed >> index) & 1
                vector[index] += 1 if bit else -1
    fingerprint = 0
    for index, weight in enumerate(vector):
        if weight >= 0:
            fingerprint |= 1 << index
    return fingerprint


def hamming_distance(lhs: int, rhs: int, bits: int = BITS) -> int:
    return (lhs ^ rhs).bit_count()


def hash_list(items: Sequence[str]) -> str:
    hasher = hashlib.blake2b(digest_size=16)
    for item in sorted(items):
        hasher.update(item.encode("utf-8"))
    return hasher.hexdigest()


def hash_token(token: str, *, seed: Optional[bytes] = None) -> int:
    if seed is None:
        seed = b"tpfr"
    hasher = hashlib.blake2b(digest_size=8, key=seed)
    hasher.update(token.encode("utf-8"))
    return int.from_bytes(hasher.digest(), "big", signed=False)


class MinHasher:
    """Simple MinHash implementation for token streams."""

    def __init__(self, num_permutations: int = DEFAULT_MINHASH_PERMUTATIONS, seed: int = 42) -> None:
        if num_permutations <= 0:
            raise ValueError("num_permutations must be positive")
        self._num_permutations = num_permutations
        self._seeds = [self._seed_bytes(seed, index) for index in range(num_permutations)]

    def signature(self, tokens: Iterable[str]) -> Tuple[int, ...]:
        mins = [2**64 - 1] * self._num_permutations
        for token in tokens:
            encoded = token.encode("utf-8")
            for index, seed in enumerate(self._seeds):
                hasher = hashlib.blake2b(digest_size=8, key=seed)
                hasher.update(encoded)
                value = int.from_bytes(hasher.digest(), "big", signed=False)
                if value < mins[index]:
                    mins[index] = value
        return tuple(mins)

    @staticmethod
    def _seed_bytes(seed: int, index: int) -> bytes:
        hasher = hashlib.blake2b(digest_size=16)
        hasher.update(seed.to_bytes(8, "big", signed=False))
        hasher.update(index.to_bytes(8, "big", signed=False))
        return hasher.digest()

