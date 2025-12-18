"""
Drift Detection Module
Computes PSI (Population Stability Index) and KS (Kolmogorov-Smirnov) statistics
for drift monitoring.
"""

import numpy as np
from scipy.stats import ks_2samp
from typing import List, Dict, Any

class DriftDetector:
    def __init__(self):
        pass

    def calculate_psi(self, expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
        """
        Calculate Population Stability Index (PSI) between two distributions.
        """
        def scale_range(input, min_val, max_val):
            input += -(np.min(input))
            input /= np.max(input) / (max_val - min_val)
            input += min_val
            return input

        breakpoints = np.arange(0, buckets + 1) / (buckets) * 100

        if len(expected) == 0 or len(actual) == 0:
            return 0.0

        # Simple binning strategy for numeric data
        # In production, use predefined bins from training data
        min_val = min(np.min(expected), np.min(actual))
        max_val = max(np.max(expected), np.max(actual))

        bins = np.linspace(min_val, max_val, buckets + 1)

        expected_percents = np.histogram(expected, bins)[0] / len(expected)
        actual_percents = np.histogram(actual, bins)[0] / len(actual)

        # Avoid division by zero
        expected_percents = np.clip(expected_percents, a_min=0.0001, a_max=None)
        actual_percents = np.clip(actual_percents, a_min=0.0001, a_max=None)

        psi_values = (expected_percents - actual_percents) * np.log(expected_percents / actual_percents)
        psi = np.sum(psi_values)

        return float(psi)

    def calculate_ks(self, expected: np.ndarray, actual: np.ndarray) -> Dict[str, float]:
        """
        Calculate KS statistic and p-value.
        """
        if len(expected) == 0 or len(actual) == 0:
            return {"statistic": 0.0, "p_value": 1.0}

        statistic, p_value = ks_2samp(expected, actual)
        return {"statistic": float(statistic), "p_value": float(p_value)}

    def detect_drift(self, reference_data: Dict[str, List[float]], current_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Detect drift for multiple features.
        """
        results = {}
        for feature, current_values in current_data.items():
            if feature in reference_data:
                ref_values = np.array(reference_data[feature])
                curr_values = np.array(current_values)

                psi = self.calculate_psi(ref_values, curr_values)
                ks = self.calculate_ks(ref_values, curr_values)

                results[feature] = {
                    "psi": psi,
                    "ks_statistic": ks["statistic"],
                    "ks_p_value": ks["p_value"],
                    "drift_detected": psi > 0.1 or ks["p_value"] < 0.05
                }
        return results
