"""Utility datasets for the Counterfactual Evaluation Harness."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

try:  # pragma: no cover - import guard for optional dependency
    from sklearn.datasets import load_breast_cancer as _load_breast_cancer
except ImportError:  # pragma: no cover
    _load_breast_cancer = None


@dataclass
class CEHDataset:
    """Container for CEH compatible datasets."""

    name: str
    data: pd.DataFrame
    target: pd.Series
    confounders: List[str] = field(default_factory=list)
    treatment: Optional[str] = None
    environments: Optional[pd.Series] = None
    description: str = ""
    metadata: Dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not isinstance(self.data, pd.DataFrame):  # pragma: no cover - defensive
            raise TypeError("data must be a pandas.DataFrame")
        if not isinstance(self.target, pd.Series):  # pragma: no cover - defensive
            raise TypeError("target must be a pandas.Series")
        if len(self.data) != len(self.target):  # pragma: no cover - defensive
            raise ValueError("data and target lengths must match")
        if self.environments is not None and len(self.environments) != len(self.data):
            raise ValueError("environment series must align with data")


def load_synthetic_demo(n_samples: int = 1500, seed: int = 7) -> CEHDataset:
    """Generate a synthetic dataset with an injected confounder.

    The dataset encodes:
    - ``signal``: causal driver of the outcome.
    - ``treatment``: intervention applied to half of the cohort.
    - ``confounder``: highly correlated with ``treatment`` but
      non-causal for the outcome once conditioning on ``treatment``.
    - ``noise`` variables: irrelevant distractors.

    Parameters
    ----------
    n_samples:
        Number of samples to generate.
    seed:
        Seed for reproducibility.
    """

    rng = np.random.default_rng(seed)
    signal = rng.normal(0.0, 1.0, size=n_samples)

    # Treatment assignment depends on the signal plus noise.
    treatment_latent = signal + rng.normal(0.0, 0.5, size=n_samples)
    treatment = (treatment_latent > np.quantile(treatment_latent, 0.5)).astype(int)

    # Confounder copies treatment with high probability but occasionally flips.
    confounder = np.where(rng.random(n_samples) < 0.85, treatment, 1 - treatment)

    # Outcome depends on signal and treatment, but not directly on confounder.
    logits = 1.2 * signal + 1.0 * treatment + rng.normal(0.0, 0.8, size=n_samples)
    outcome = (logits > 0.2).astype(int)

    # Add additional irrelevant noise dimensions.
    noise_1 = rng.normal(0, 1, size=n_samples)
    noise_2 = rng.normal(0, 1, size=n_samples)

    frame = pd.DataFrame(
        {
            "signal": signal,
            "treatment": treatment,
            "confounder": confounder,
            "noise_a": noise_1,
            "noise_b": noise_2,
        }
    )
    target = pd.Series(outcome, name="outcome")
    environments = pd.Series(confounder, name="environment")

    return CEHDataset(
        name="synthetic_confounder",
        data=frame,
        target=target,
        confounders=["confounder"],
        treatment="treatment",
        environments=environments,
        description="Synthetic binary classification task with a spurious confounder",
        metadata={
            "true_signal": "signal",
            "uplift_target": "outcome",
        },
    )


def load_breast_cancer_demo(seed: int = 11) -> CEHDataset:
    """Create a small real-world dataset with an injected spurious feature."""

    if _load_breast_cancer is None:  # pragma: no cover - optional dependency missing
        raise ImportError("scikit-learn is required for the breast cancer demo")

    dataset = _load_breast_cancer(as_frame=True)
    frame = dataset.frame.copy()
    target = dataset.target.rename("outcome")

    rng = np.random.default_rng(seed)

    # Construct a pseudo-treatment from an existing feature threshold.
    treatment = (frame["mean radius"] > frame["mean radius"].median()).astype(int)

    # Inject a confounder derived from the target with additional noise to mimic leakage.
    confounder = np.where(rng.random(len(frame)) < 0.8, target, 1 - target)

    frame["treatment"] = treatment
    frame["confounder"] = confounder

    environments = pd.Series(confounder, index=frame.index, name="environment")

    return CEHDataset(
        name="breast_cancer_with_confounds",
        data=frame,
        target=target,
        confounders=["confounder"],
        treatment="treatment",
        environments=environments,
        description="Breast cancer diagnostic dataset augmented with a synthetic confounder",
        metadata={
            "source": "sklearn.datasets.load_breast_cancer",
            "feature_count": frame.shape[1],
        },
    )


__all__ = [
    "CEHDataset",
    "load_synthetic_demo",
    "load_breast_cancer_demo",
]
