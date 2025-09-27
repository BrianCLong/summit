"""Differential privacy utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class DPReport:
    """Summary of the DP configuration used to perturb synthetic samples."""

    epsilon: float
    delta: float
    sigma: Dict[str, float]


def gaussian_sigma(epsilon: float, delta: float, sensitivity: float) -> float:
    """Calibrate the Gaussian mechanism standard deviation."""

    if sensitivity <= 0:
        raise ValueError("sensitivity must be positive")
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    if not (0 < delta < 1):
        raise ValueError("delta must be within (0, 1)")
    return float(np.sqrt(2 * np.log(1.25 / delta)) * sensitivity / epsilon)


def infer_sensitivity(minority: pd.DataFrame) -> Dict[str, float]:
    """Estimate feature sensitivities from the minority slice."""

    sensitivities: Dict[str, float] = {}
    for column in minority.select_dtypes(include=["number"]).columns:
        col = minority[column]
        sensitivities[column] = float(col.max() - col.min() or 1.0)
    return sensitivities


def apply_gaussian_noise(
    df: pd.DataFrame,
    sigma_map: Dict[str, float],
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Apply Gaussian noise to numeric columns as per ``sigma_map``."""

    noisy = df.copy()
    for column, sigma in sigma_map.items():
        if sigma <= 0:
            continue
        if column not in noisy:
            continue
        if not np.issubdtype(noisy[column].dtype, np.number):
            continue
        noise = rng.normal(loc=0.0, scale=sigma, size=len(noisy))
        noisy[column] = noisy[column] + noise
    return noisy


def validate_dp_parameters(epsilon: float, delta: float) -> None:
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    if not (0 < delta < 1):
        raise ValueError("delta must be within (0, 1)")
