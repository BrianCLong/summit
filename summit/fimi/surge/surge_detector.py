# summit/fimi/surge/surge_detector.py

from typing import List, Dict, Any

class SurgeDetector:
    """
    Detects surges in narrative volume or activity during specific diplomatic windows.
    """

    def __init__(self, threshold: float = 2.0):
        self.threshold = threshold

    def detect_spikes(self, time_series: List[float]) -> List[int]:
        """
        Simple Z-score like anomaly detection.
        Returns indices of detected spikes.
        """
        if not time_series:
            return []

        avg = sum(time_series) / len(time_series)
        spikes = []
        for i, val in enumerate(time_series):
            if val > avg * self.threshold:
                spikes.append(i)
        return spikes

    def check_window(self, data: List[float], window_name: str) -> Dict[str, Any]:
        spikes = self.detect_spikes(data)
        return {
            "window_name": window_name,
            "surge_detected": len(spikes) > 0,
            "spike_indices": spikes
        }
