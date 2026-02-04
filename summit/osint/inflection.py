from typing import List, Dict, Any
from datetime import datetime

class InflectionMetric:
    """
    Computes first and second order derivatives for a time series to detect inflection points.
    """
    def __init__(self, time_series: List[Dict[str, Any]], value_key: str = "value"):
        """
        Initialize with a time series of data points.
        Each point must have 'timestamp' and the specified value_key.
        """
        # Sort by timestamp to ensure chronological order
        self.series = sorted(time_series, key=lambda x: x.get('timestamp', ''))
        self.value_key = value_key

    def compute(self) -> Dict[str, Any]:
        """
        Compute velocity, acceleration, and jerk.
        """
        if len(self.series) < 3:
            return {
                "error": "Insufficient data",
                "velocity": 0.0,
                "acceleration": 0.0,
                "jerk": 0.0,
                "inflection_point": False
            }

        values = []
        try:
            values = [float(x[self.value_key]) for x in self.series]
        except (ValueError, KeyError):
            return {"error": "Invalid data format"}

        # First derivative (velocity)
        velocity = []
        for i in range(1, len(values)):
            velocity.append(values[i] - values[i-1])

        # Second derivative (acceleration)
        acceleration = []
        for i in range(1, len(velocity)):
            acceleration.append(velocity[i] - velocity[i-1])

        # Third derivative (jerk)
        jerk = []
        for i in range(1, len(acceleration)):
            jerk.append(acceleration[i] - acceleration[i-1])

        is_inflection = False
        if len(acceleration) > 1:
            # Sign change in acceleration indicates inflection point
            # Use small epsilon for float comparison if needed, but strict sign change is usually sufficient for discrete
            is_inflection = (acceleration[-1] * acceleration[-2] < 0)

        return {
            "latest_value": values[-1],
            "velocity": velocity[-1] if velocity else 0.0,
            "acceleration": acceleration[-1] if acceleration else 0.0,
            "jerk": jerk[-1] if jerk else 0.0,
            "inflection_point": is_inflection
        }
