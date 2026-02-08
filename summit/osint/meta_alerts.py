from typing import List, Dict, Any
from datetime import datetime

class MetaAlertMonitor:
    """
    Analyzes alert patterns to detect second-order anomalies (quieting, thrashing).
    """
    def __init__(self, silence_threshold_hours: int = 24, thrashing_count: int = 5):
        self.silence_threshold_hours = silence_threshold_hours
        self.thrashing_count = thrashing_count

    def analyze_alerts(self, alert_history: List[Dict[str, Any]], window_start: str) -> List[Dict[str, Any]]:
        """
        Analyze a history of alerts within a time window.
        """
        meta_alerts = []

        # Filter alerts in window (assuming caller passed relevant history, but we double check)
        active_alerts = [a for a in alert_history if a.get('timestamp', '') >= window_start]

        if not active_alerts:
            meta_alerts.append({
                "type": "QUIETED",
                "severity": "warning",
                "message": "No alerts detected in monitoring window (potential silence)"
            })
        elif len(active_alerts) >= self.thrashing_count:
            meta_alerts.append({
                "type": "THRASHING",
                "severity": "critical",
                "message": f"High volume of alerts ({len(active_alerts)}) detected (potential thrashing)"
            })

        return meta_alerts
