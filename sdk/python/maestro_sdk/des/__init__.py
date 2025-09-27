from __future__ import annotations

import json
import math
import threading
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Sequence

__all__ = [
    "NormalizationStep",
    "DeterministicQuantization",
    "PoolingMethod",
    "EmbeddingConfig",
    "EmbeddingRecord",
    "EmbeddingStore",
    "DeterministicBatcher",
    "cosine_drift",
    "CosineDrift",
    "DriftEntry",
]


@dataclass(frozen=True)
class NormalizationStep:
    kind: str
    epsilon: float | None = None

    def apply(self, vector: List[float]) -> None:
        if not vector:
            return
        if self.kind == "l2":
            norm = math.sqrt(sum(float(v) * float(v) for v in vector))
            if norm == 0:
                return
            for idx, value in enumerate(vector):
                vector[idx] = float(value) / norm
        elif self.kind == "mean-center":
            mean = sum(float(v) for v in vector) / len(vector)
            for idx, value in enumerate(vector):
                vector[idx] = float(value) - mean
        elif self.kind == "z-score":
            mean = sum(float(v) for v in vector) / len(vector)
            variance = sum((float(v) - mean) ** 2 for v in vector) / len(vector)
            std = math.sqrt(variance + (self.epsilon or 0.0))
            if std == 0:
                return
            for idx, value in enumerate(vector):
                vector[idx] = (float(value) - mean) / std
        else:
            raise ValueError(f"unknown normalization step: {self.kind}")


@dataclass(frozen=True)
class DeterministicQuantization:
    method: str
    bits: int
    scale: float
    zero_point: float

    def apply(self, vector: List[float]) -> None:
        if not vector:
            return
        levels = (1 << self.bits) - 1
        for idx, value in enumerate(vector):
            transformed = float(value) / self.scale + self.zero_point
            clamped = min(max(transformed, 0.0), float(levels))
            quantized = round(clamped)
            vector[idx] = (quantized - self.zero_point) * self.scale


PoolingMethod = str


@dataclass(frozen=True)
class EmbeddingConfig:
    model_id: str
    model_hash: str
    tokenizer_hash: str
    pooling: PoolingMethod
    quantization: Optional[DeterministicQuantization] = None
    pre_normalization: List[NormalizationStep] = field(default_factory=list)
    post_normalization: List[NormalizationStep] = field(default_factory=list)

    def signature(self) -> str:
        return json.dumps(asdict(self), sort_keys=True, default=_serialize_dataclass)

    def apply_pipeline(self, vector: Sequence[float]) -> List[float]:
        working = [float(v) for v in vector]
        for step in self.pre_normalization:
            step.apply(working)
        if self.quantization:
            self.quantization.apply(working)
        for step in self.post_normalization:
            step.apply(working)
        return working

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "EmbeddingConfig":
        quantization = payload.get("quantization")
        quantization_obj = (
            DeterministicQuantization(**quantization) if quantization is not None else None
        )
        return cls(
            model_id=payload["model_id"],
            model_hash=payload["model_hash"],
            tokenizer_hash=payload["tokenizer_hash"],
            pooling=payload["pooling"],
            quantization=quantization_obj,
            pre_normalization=[NormalizationStep(**step) for step in payload.get("pre_normalization", [])],
            post_normalization=[NormalizationStep(**step) for step in payload.get("post_normalization", [])],
        )


def _serialize_dataclass(value: Any) -> Any:
    if hasattr(value, "__dict__"):
        return asdict(value)
    return value


@dataclass(frozen=True)
class EmbeddingRecord:
    item_id: str
    version: str
    config: EmbeddingConfig
    vector: List[float]
    metadata: Optional[Dict[str, Any]] = None

    @classmethod
    def from_raw(
        cls,
        *,
        item_id: str,
        version: str,
        config: EmbeddingConfig,
        vector: Sequence[float],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "EmbeddingRecord":
        processed = config.apply_pipeline(vector)
        return cls(
            item_id=item_id,
            version=version,
            config=config,
            vector=processed,
            metadata=metadata,
        )

    @property
    def dimension(self) -> int:
        return len(self.vector)


class EmbeddingStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._store: Dict[str, Dict[str, EmbeddingRecord]] = {}

    def upsert(self, record: EmbeddingRecord) -> EmbeddingRecord:
        with self._lock:
            versions = self._store.setdefault(record.item_id, {})
            existing = versions.get(record.version)
            if existing:
                if existing.config.signature() != record.config.signature() or existing.vector != record.vector:
                    raise ValueError(
                        f"conflicting embedding for {record.item_id} @ {record.version}: reproducibility violated"
                    )
                return existing
            if versions:
                any_record = next(iter(versions.values()))
                if any_record.dimension != record.dimension:
                    raise ValueError(
                        f"dimension mismatch for {record.item_id}: expected {any_record.dimension}, got {record.dimension}"
                    )
            versions[record.version] = record
            return record

    def get(self, item_id: str, version: str) -> EmbeddingRecord:
        with self._lock:
            versions = self._store.get(item_id)
            if not versions or version not in versions:
                raise KeyError(f"embedding not found for {item_id} @ {version}")
            return versions[version]

    def versions_for(self, item_id: str) -> Optional[List[str]]:
        with self._lock:
            versions = self._store.get(item_id)
            if not versions:
                return None
            return sorted(versions.keys())

    def records_for_version(self, version: str) -> Dict[str, EmbeddingRecord]:
        with self._lock:
            result = {
                item_id: record
                for item_id, versions in self._store.items()
                if (record := versions.get(version)) is not None
            }
            return dict(sorted(result.items(), key=lambda item: item[0]))

    def export_snapshot(self) -> str:
        with self._lock:
            snapshot = {
                item_id: {version: asdict(record) for version, record in sorted(versions.items())}
                for item_id, versions in sorted(self._store.items())
            }
        return json.dumps(snapshot, indent=2, sort_keys=True)

    def import_snapshot(self, snapshot: str) -> None:
        decoded = json.loads(snapshot)
        with self._lock:
            self._store.clear()
            for item_id in sorted(decoded.keys()):
                version_map: Dict[str, EmbeddingRecord] = {}
                for version in sorted(decoded[item_id].keys()):
                    payload = decoded[item_id][version]
                    config = EmbeddingConfig.from_dict(payload["config"])
                    record = EmbeddingRecord(
                        item_id=item_id,
                        version=version,
                        config=config,
                        vector=list(payload["vector"]),
                        metadata=payload.get("metadata"),
                    )
                    version_map[version] = record
                self._store[item_id] = version_map


class DeterministicBatcher:
    def __init__(self, batch_size: int = 64) -> None:
        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        self.batch_size = batch_size

    def batch(self, items: Sequence[Any], key_fn) -> List[List[Any]]:
        ordered = sorted(items, key=key_fn)
        return [ordered[i : i + self.batch_size] for i in range(0, len(ordered), self.batch_size)]

    def batch_with_score(self, items: Sequence[Any], score_fn) -> List[List[Any]]:
        ordered = sorted(items, key=score_fn)
        return [ordered[i : i + self.batch_size] for i in range(0, len(ordered), self.batch_size)]


@dataclass(frozen=True)
class DriftEntry:
    item_id: str
    baseline_version: str
    candidate_version: str
    cosine_similarity: float
    cosine_delta: float


@dataclass(frozen=True)
class CosineDrift:
    entries: List[DriftEntry]
    missing_from_candidate: List[str]
    missing_from_baseline: List[str]
    average_similarity: float

    def worst(self) -> Optional[DriftEntry]:
        return min(self.entries, key=lambda entry: entry.cosine_similarity, default=None)


def cosine_drift(
    baseline: Mapping[str, EmbeddingRecord],
    candidate: Mapping[str, EmbeddingRecord],
) -> CosineDrift:
    entries: List[DriftEntry] = []
    missing_from_candidate: List[str] = []
    missing_from_baseline: List[str] = []

    for item_id, base_record in baseline.items():
        target = candidate.get(item_id)
        if not target:
            missing_from_candidate.append(item_id)
            continue
        cosine = _cosine_similarity(base_record.vector, target.vector)
        entries.append(
            DriftEntry(
                item_id=item_id,
                baseline_version=base_record.version,
                candidate_version=target.version,
                cosine_similarity=cosine,
                cosine_delta=1.0 - cosine,
            )
        )

    for item_id in candidate.keys():
        if item_id not in baseline:
            missing_from_baseline.append(item_id)

    if not entries:
        raise ValueError("no overlapping embeddings between versions to diff")

    entries.sort(key=lambda entry: entry.item_id)
    missing_from_candidate.sort()
    missing_from_baseline.sort()
    average_similarity = sum(entry.cosine_similarity for entry in entries) / len(entries)

    return CosineDrift(
        entries=entries,
        missing_from_candidate=missing_from_candidate,
        missing_from_baseline=missing_from_baseline,
        average_similarity=average_similarity,
    )


def _cosine_similarity(lhs: Sequence[float], rhs: Sequence[float]) -> float:
    dot = sum(float(x) * float(y) for x, y in zip(lhs, rhs))
    lhs_norm = math.sqrt(sum(float(x) * float(x) for x in lhs))
    rhs_norm = math.sqrt(sum(float(y) * float(y) for y in rhs))
    if lhs_norm == 0 or rhs_norm == 0:
        return 0.0
    return dot / (lhs_norm * rhs_norm)
