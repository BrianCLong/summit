from datetime import timezone
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime

from summit.risk.persona_campaign_risk import RiskLevel

class AlertState(Enum):
    NEW = "NEW"
    IN_REVIEW = "IN_REVIEW"
    HANDLED = "HANDLED"

@dataclass
class RiskEvent:
    subject_type: str
    subject_id: str
    risk_score: float
    risk_level: RiskLevel
    timestamp: datetime

@dataclass
class RiskAlert:
    alert_id: str
    subject_type: str
    subject_id: str
    alert_level: RiskLevel
    window: float # duration in seconds
    reasons: List[str]
    state: AlertState = AlertState.NEW
    state_history: List[Dict] = field(default_factory=list)


import uuid

class RiskAlertingEngine:
    def __init__(self, window_seconds: float = 86400.0, score_threshold: float = 75.0, high_event_threshold: int = 3):
        self.window_seconds = window_seconds
        self.score_threshold = score_threshold
        self.high_event_threshold = high_event_threshold

        # Internal indexes
        self._events: Dict[str, List[RiskEvent]] = {} # Keyed by subject_type:subject_id
        self._alerts: Dict[str, RiskAlert] = {}

    def _get_key(self, subject_type: str, subject_id: str) -> str:
        return f"{subject_type}:{subject_id}"

    def record_risk_event(self, event: RiskEvent):
        key = self._get_key(event.subject_type, event.subject_id)
        if key not in self._events:
            self._events[key] = []
        self._events[key].append(event)
        self._cleanup_old_events(key, event.timestamp)
        self._evaluate_thresholds(key, event.timestamp)

    def _cleanup_old_events(self, key: str, current_time: datetime):
        if key not in self._events:
            return

        valid_events = []
        for event in self._events[key]:
            age = (current_time - event.timestamp).total_seconds()
            if age <= self.window_seconds:
                valid_events.append(event)
        self._events[key] = valid_events

    def _evaluate_thresholds(self, key: str, current_time: datetime):
        events = self._events.get(key, [])
        if not events:
            return

        subject_type = events[0].subject_type
        subject_id = events[0].subject_id

        # Calculate aggregate score or patterns
        total_score = sum(e.risk_score for e in events)
        high_critical_count = sum(1 for e in events if e.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL))

        should_alert = False
        alert_level = RiskLevel.LOW
        reasons = []

        if total_score >= self.score_threshold:
            should_alert = True
            alert_level = RiskLevel.CRITICAL if total_score >= 100 else RiskLevel.HIGH
            reasons.append(f"Aggregate risk score crossed threshold ({total_score} >= {self.score_threshold})")

        if high_critical_count >= self.high_event_threshold:
            should_alert = True
            alert_level = RiskLevel.CRITICAL if high_critical_count > self.high_event_threshold else RiskLevel.HIGH
            reasons.append(f"Frequent high-severity events ({high_critical_count} >= {self.high_event_threshold})")

        if should_alert:
            # Check for existing active alerts to deduplicate
            existing_alert = self._get_active_alert_for_subject(subject_type, subject_id)
            if existing_alert:
                # Update existing alert if escalation
                if self._level_value(alert_level) > self._level_value(existing_alert.alert_level):
                    existing_alert.alert_level = alert_level
                    existing_alert.reasons.extend(r for r in reasons if r not in existing_alert.reasons)
            else:
                alert_id = str(uuid.uuid4())
                alert = RiskAlert(
                    alert_id=alert_id,
                    subject_type=subject_type,
                    subject_id=subject_id,
                    alert_level=alert_level,
                    window=self.window_seconds,
                    reasons=reasons
                )
                self._alerts[alert_id] = alert

    def _level_value(self, level: RiskLevel) -> int:
        if level == RiskLevel.LOW: return 1
        if level == RiskLevel.MEDIUM: return 2
        if level == RiskLevel.HIGH: return 3
        if level == RiskLevel.CRITICAL: return 4
        return 0

    def _get_active_alert_for_subject(self, subject_type: str, subject_id: str) -> Optional[RiskAlert]:
        for alert in self._alerts.values():
            if alert.subject_type == subject_type and alert.subject_id == subject_id and alert.state != AlertState.HANDLED:
                return alert
        return None

    def get_current_alerts(self, subject_type: Optional[str] = None, state: Optional[AlertState] = None) -> List[RiskAlert]:
        result = []
        for alert in self._alerts.values():
            if subject_type and alert.subject_type != subject_type:
                continue
            if state and alert.state != state:
                continue
            result.append(alert)
        return result

    def update_alert_state(self, alert_id: str, new_state: AlertState, actor: str = "system", notes: str = ""):
        if alert_id in self._alerts:
            alert = self._alerts[alert_id]
            old_state = alert.state
            alert.state = new_state
            alert.state_history.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "actor": actor,
                "old_state": old_state.value,
                "new_state": new_state.value,
                "notes": notes
            })
            return True
        return False
