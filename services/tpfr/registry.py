"""Registry and similarity search for tabular perceptual fingerprints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .fingerprint import (
    ColumnSketch,
    TableFingerprint,
    TableFingerprintBuilder,
    hamming_distance,
)


@dataclass
class RegistryEntry:
    identifier: str
    fingerprint: TableFingerprint
    metadata: Optional[Dict[str, Any]] = None


def schema_set(fingerprint: TableFingerprint) -> Sequence[Tuple[str, str]]:
    return tuple(sorted((name, sketch.dtype) for name, sketch in fingerprint.columns.items()))


def jaccard(lhs: Sequence[Any], rhs: Sequence[Any]) -> float:
    set_lhs = set(lhs)
    set_rhs = set(rhs)
    if not set_lhs and not set_rhs:
        return 1.0
    intersection = len(set_lhs & set_rhs)
    union = len(set_lhs | set_rhs)
    if union == 0:
        return 0.0
    return intersection / union


def minhash_jaccard(lhs: Sequence[int], rhs: Sequence[int]) -> float:
    if not lhs or not rhs:
        return 0.0
    matches = sum(1 for left, right in zip(lhs, rhs) if left == right)
    return matches / min(len(lhs), len(rhs))


def fingerprint_similarity(lhs: TableFingerprint, rhs: TableFingerprint) -> float:
    schema_similarity = jaccard(schema_set(lhs), schema_set(rhs))
    common_columns = set(lhs.columns) & set(rhs.columns)
    if common_columns:
        column_similarities = [
            lhs.columns[column].similarity(rhs.columns[column]) for column in common_columns
        ]
        column_similarity = sum(column_similarities) / len(column_similarities)
    else:
        column_similarity = 0.0
    coverage = len(common_columns) / max(len(lhs.columns), len(rhs.columns), 1)
    minhash_similarity = minhash_jaccard(lhs.minhash_signature, rhs.minhash_signature)
    combined_column_similarity = column_similarity * coverage
    return 0.4 * schema_similarity + 0.4 * combined_column_similarity + 0.2 * minhash_similarity


class TabularPerceptualFingerprintRegistry:
    """In-memory registry supporting insertion and similarity queries."""

    def __init__(self, *, similarity_threshold: float = 0.75, num_permutations: int = 128) -> None:
        self._builder = TableFingerprintBuilder(num_permutations=num_permutations)
        self._entries: Dict[str, RegistryEntry] = {}
        self._threshold = similarity_threshold

    @property
    def entries(self) -> Sequence[RegistryEntry]:
        return tuple(self._entries.values())

    def compute_fingerprint(self, table: Any) -> TableFingerprint:
        return self._builder.build(table)

    def add(self, identifier: str, table: Any, metadata: Optional[Dict[str, Any]] = None) -> RegistryEntry:
        fingerprint = self.compute_fingerprint(table)
        entry = RegistryEntry(identifier=identifier, fingerprint=fingerprint, metadata=metadata)
        self._entries[identifier] = entry
        return entry

    def query(self, table: Any, *, k: int = 5) -> List[Tuple[RegistryEntry, float]]:
        fingerprint = self.compute_fingerprint(table)
        return self.search(fingerprint, k=k)

    def search(self, fingerprint: TableFingerprint, *, k: int = 5) -> List[Tuple[RegistryEntry, float]]:
        scored: List[Tuple[RegistryEntry, float]] = []
        for entry in self._entries.values():
            similarity = fingerprint_similarity(fingerprint, entry.fingerprint)
            scored.append((entry, similarity))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:k]

    def find_similar(self, table: Any, *, threshold: Optional[float] = None) -> List[Tuple[RegistryEntry, float]]:
        effective_threshold = threshold if threshold is not None else self._threshold
        candidates = self.query(table, k=len(self._entries))
        return [candidate for candidate in candidates if candidate[1] >= effective_threshold]

    def explain_difference(
        self, lhs: Any, rhs: Any, *, include_all_columns: bool = False
    ) -> Dict[str, Any]:
        left_fp = lhs if isinstance(lhs, TableFingerprint) else self.compute_fingerprint(lhs)
        right_fp = rhs if isinstance(rhs, TableFingerprint) else self.compute_fingerprint(rhs)
        schema_similarity = jaccard(schema_set(left_fp), schema_set(right_fp))
        minhash_similarity = minhash_jaccard(left_fp.minhash_signature, right_fp.minhash_signature)
        overall_similarity = fingerprint_similarity(left_fp, right_fp)
        left_columns = set(left_fp.columns)
        right_columns = set(right_fp.columns)
        removed = sorted(left_columns - right_columns)
        added = sorted(right_columns - left_columns)
        type_changes = {
            column: {
                "lhs": left_fp.columns[column].dtype,
                "rhs": right_fp.columns[column].dtype,
            }
            for column in sorted(left_columns & right_columns)
            if left_fp.columns[column].dtype != right_fp.columns[column].dtype
        }
        column_details: List[Dict[str, Any]] = []
        shared = sorted(left_columns & right_columns)
        for column in shared:
            left_sketch = left_fp.columns[column]
            right_sketch = right_fp.columns[column]
            similarity = left_sketch.similarity(right_sketch)
            entry = {
                "column": column,
                "similarity": round(similarity, 4),
                "simhash_hamming": hamming_distance(left_sketch.simhash, right_sketch.simhash),
                "density_lhs": round(left_sketch.density, 4),
                "density_rhs": round(right_sketch.density, 4),
            }
            if left_sketch.dtype == right_sketch.dtype == "numeric":
                entry["mean_delta"] = round((right_sketch.mean or 0.0) - (left_sketch.mean or 0.0), 4)
                entry["deviation_delta"] = round(
                    (right_sketch.deviation or 0.0) - (left_sketch.deviation or 0.0), 4
                )
            if include_all_columns or similarity < 0.95:
                column_details.append(entry)
        explanation = {
            "overall_similarity": round(overall_similarity, 4),
            "schema_similarity": round(schema_similarity, 4),
            "minhash_similarity": round(minhash_similarity, 4),
            "schema_changes": {
                "added": added,
                "removed": removed,
                "type_changes": type_changes,
            },
            "column_differences": column_details,
        }
        return explanation

