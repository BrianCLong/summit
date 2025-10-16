"""Data structures and utilities for the PCKD workflow."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

import numpy as np


@dataclass(frozen=True)
class Example:
    """A single training example."""

    example_id: str
    features: Sequence[float]
    label: int
    metadata: dict[str, str] = field(default_factory=dict)

    def feature_array(self) -> np.ndarray:
        return np.asarray(self.features, dtype=np.float64)


@dataclass
class TaintScreenResult:
    """Result of applying policy filters to a dataset."""

    allowed: list[Example]
    rejected: list[Example]
    rejection_reasons: dict[str, str]

    def allowed_ids(self) -> list[str]:
        return [example.example_id for example in self.allowed]

    def rejected_ids(self) -> list[str]:
        return [example.example_id for example in self.rejected]


class Dataset:
    """Simple in-memory dataset container with reproducible digests."""

    def __init__(self, examples: Iterable[Example]):
        self._examples = list(examples)
        if not self._examples:
            raise ValueError("Dataset must contain at least one example.")

    def __iter__(self):
        return iter(self._examples)

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._examples)

    def examples(self) -> list[Example]:
        return list(self._examples)

    def feature_matrix(self, subset: Iterable[Example] | None = None) -> np.ndarray:
        items = list(subset) if subset is not None else self._examples
        return np.vstack([ex.feature_array() for ex in items])

    def labels(self, subset: Iterable[Example] | None = None) -> np.ndarray:
        items = list(subset) if subset is not None else self._examples
        return np.asarray([ex.label for ex in items], dtype=np.float64)

    def digest(self, subset: Iterable[Example] | None = None) -> str:
        items = list(subset) if subset is not None else self._examples
        payload = [
            {
                "id": ex.example_id,
                "features": list(map(float, ex.features)),
                "label": int(ex.label),
                "metadata": dict(sorted(ex.metadata.items())),
            }
            for ex in sorted(items, key=lambda item: item.example_id)
        ]
        raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()


def compute_rejection_digest(rejection_reasons: dict[str, str]) -> str:
    """Create a deterministic digest for rejection reasons."""

    raw = json.dumps(
        sorted(rejection_reasons.items(), key=lambda item: item[0]),
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
