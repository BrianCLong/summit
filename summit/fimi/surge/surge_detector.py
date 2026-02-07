# summit/fimi/surge/surge_detector.py
from typing import Any, Dict, List


class FIMISurgeDetector:
    def detect_spikes(self, time_series: list[dict[str, Any]], threshold: float = 2.0) -> list[dict[str, Any]]:
        if not time_series:
            return []

        # Simple anomaly detection: compare volume to average
        volumes = [item["volume"] for item in time_series]
        avg_volume = sum(volumes) / len(volumes)

        spikes = []
        for item in time_series:
            if item["volume"] > avg_volume * threshold:
                spikes.append({
                    "timestamp": item["timestamp"],
                    "volume": item["volume"],
                    "score": item["volume"] / avg_volume,
                    "type": "surge"
                })
        return spikes
