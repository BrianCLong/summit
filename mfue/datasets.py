"""Dataset helpers for MFUE."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple

import numpy as np


@dataclass(frozen=True)
class DatasetSplit:
    """Container for a dataset split used by the evaluator.

    Parameters
    ----------
    features:
        2D numpy array containing the feature vectors.
    labels:
        1D numpy array with class labels encoded as 0/1.
    name:
        Friendly split name displayed in reports.
    """

    features: np.ndarray
    labels: np.ndarray
    name: str

    def __post_init__(self) -> None:  # pragma: no cover - dataclass hook trivial
        if self.features.ndim != 2:
            raise ValueError("features must be 2-dimensional [n_samples, n_features]")
        if self.labels.ndim != 1:
            raise ValueError("labels must be 1-dimensional [n_samples]")
        if self.features.shape[0] != self.labels.shape[0]:
            raise ValueError("features and labels must have matching sample counts")

    def __len__(self) -> int:
        return self.features.shape[0]

    def iter_batches(self, batch_size: int) -> Iterable[Tuple[np.ndarray, np.ndarray]]:
        """Yield mini-batches from the split.

        Parameters
        ----------
        batch_size:
            Number of examples per batch.
        """

        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        for start in range(0, len(self), batch_size):
            end = min(start + batch_size, len(self))
            yield self.features[start:end], self.labels[start:end]
