from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from collections import defaultdict
from .persona_campaign_risk import RiskLevel

class RiskEvent(BaseModel):
    subject_type: str  # "PERSONA" or "CAMPAIGN"
    subject_id: str
    risk_score: float
    risk_level: RiskLevel
    timestamp: datetime = datetime.now(timezone.utc)

class RiskAlert(BaseModel):
    alert_id: str
    subject_type: str
    subject_id: str
    alert_level: RiskLevel
    window: timedelta
    reasons: List[str]
    timestamp: datetime = datetime.now(timezone.utc)
    status: str = "NEW" # NEW, IN_REVIEW, HANDLED

class AlertingEngine:
    def __init__(self, window_hours: int = 24, alert_threshold: float = 75.0):
        self.events: List[RiskEvent] = []
        self.alerts: List[RiskAlert] = []
        self.window_hours = window_hours
        self.alert_threshold = alert_threshold

    def record_risk_event(self, event: RiskEvent) -> Optional[RiskAlert]:
        self.events.append(event)

        # Cleanup old events out of window
        cutoff = datetime.now(timezone.utc) - timedelta(hours=self.window_hours)
        self.events = [e for e in self.events if e.timestamp >= cutoff]

        # Aggregate risk for this subject
        subject_events = [e for e in self.events if e.subject_id == event.subject_id and e.subject_type == event.subject_type]

        if not subject_events:
            return None

        # Simple aggregation: taking the max score within the window
        max_score = max(e.risk_score for e in subject_events)

        # Check if we should alert
        if max_score >= self.alert_threshold:
            # Check if we already alerted recently (deduplication)
            recent_alerts = [a for a in self.alerts if a.subject_id == event.subject_id and a.timestamp >= cutoff]
            if not recent_alerts:
                # Generate new alert
                new_alert = RiskAlert(
                    alert_id=f"ALT-{event.subject_type}-{event.subject_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    subject_type=event.subject_type,
                    subject_id=event.subject_id,
                    alert_level=RiskLevel.HIGH if max_score < 90 else RiskLevel.CRITICAL,
                    window=timedelta(hours=self.window_hours),
                    reasons=[f"Max score {max_score} crossed threshold {self.alert_threshold}"]
                )
                self.alerts.append(new_alert)
                return new_alert
        return None

    def get_current_alerts(self, status: str = None) -> List[RiskAlert]:
        if status:
            return [a for a in self.alerts if a.status == status]
        return self.alerts

    def update_alert_status(self, alert_id: str, new_status: str):
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.status = new_status
                return True
        return False
