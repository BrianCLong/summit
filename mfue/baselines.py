"""Reference unlearning baselines."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np

from .datasets import DatasetSplit
from .models import LogisticRegressionModel


class BaseUnlearningBaseline(Protocol):
    """Protocol implemented by unlearning baselines."""

    def unlearn(
        self,
        model: LogisticRegressionModel,
        forget_split: DatasetSplit,
        retain_split: DatasetSplit,
    ) -> LogisticRegressionModel:
        """Return a copy of ``model`` with the forget set removed."""


@dataclass
class FineTuneUnlearningBaseline:
    """Retrains the model on the retain split and actively forgets the target set."""

    learning_rate: float = 0.1
    steps: int = 200
    batch_size: int = 32
    forget_steps: int = 80
    forget_learning_rate: float = 0.2

    def unlearn(
        self,
        model: LogisticRegressionModel,
        forget_split: DatasetSplit,
        retain_split: DatasetSplit,
    ) -> LogisticRegressionModel:
        clone = model.copy()
        if len(retain_split) > 0:
            clone.fit(
                retain_split.features,
                retain_split.labels,
                steps=self.steps,
                learning_rate=self.learning_rate,
                batch_size=self.batch_size,
                shuffle=True,
            )
        if len(forget_split) > 0 and self.forget_steps > 0:
            for _ in range(self.forget_steps):
                grad_w, grad_b = clone._compute_gradient(  # type: ignore[attr-defined]
                    forget_split.features,
                    forget_split.labels,
                )
                clone.weights += self.forget_learning_rate * grad_w
                clone.bias += self.forget_learning_rate * grad_b
        return clone


@dataclass
class MaskBasedUnlearningBaseline:
    """Applies a gradient-informed mask to dampen forget set influence."""

    mask_strength: float = 5.0

    def unlearn(
        self,
        model: LogisticRegressionModel,
        forget_split: DatasetSplit,
        retain_split: DatasetSplit,
    ) -> LogisticRegressionModel:
        clone = model.copy()
        if len(forget_split) == 0:
            return clone
        logits = clone.decision_function(forget_split.features)
        residual = clone._sigmoid(logits) - forget_split.labels  # type: ignore[attr-defined]
        gradient = forget_split.features.T @ residual / len(forget_split)
        mask = np.exp(-self.mask_strength * np.abs(gradient))
        clone.weights *= mask
        clone.bias *= float(np.exp(-self.mask_strength * np.abs(residual.mean())))
        if len(retain_split) > 0:
            clone.fit(
                retain_split.features,
                retain_split.labels,
                steps=50,
                learning_rate=0.05,
                batch_size=len(retain_split),
                shuffle=False,
            )
        return clone
