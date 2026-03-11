from datetime import timezone
import pytest
from datetime import datetime, timedelta
from summit.risk.persona_campaign_risk import RiskLevel
from summit.risk.alerting_engine import (
    RiskAlertingEngine,
    RiskEvent,
    AlertState
)

def test_no_alert_on_low_noise():
    engine = RiskAlertingEngine(score_threshold=75.0)
    base_time = datetime.now(timezone.utc)

    # 5 low events, score 10 each = 50. Should not alert.
    for i in range(5):
        event = RiskEvent(
            subject_type="PERSONA",
            subject_id="p1",
            risk_score=10.0,
            risk_level=RiskLevel.LOW,
            timestamp=base_time + timedelta(minutes=i)
        )
        engine.record_risk_event(event)

    alerts = engine.get_current_alerts()
    assert len(alerts) == 0

def test_alert_on_score_threshold():
    engine = RiskAlertingEngine(score_threshold=75.0)
    base_time = datetime.now(timezone.utc)

    engine.record_risk_event(RiskEvent("PERSONA", "p1", 50.0, RiskLevel.HIGH, base_time))
    engine.record_risk_event(RiskEvent("PERSONA", "p1", 30.0, RiskLevel.MEDIUM, base_time + timedelta(minutes=1)))

    alerts = engine.get_current_alerts()
    assert len(alerts) == 1
    assert alerts[0].alert_level == RiskLevel.HIGH
    assert alerts[0].subject_id == "p1"

def test_alert_on_frequency_threshold():
    engine = RiskAlertingEngine(score_threshold=200.0, high_event_threshold=3)
    base_time = datetime.now(timezone.utc)

    # 3 high events, total score 150 (below 200 threshold).
    for i in range(3):
        event = RiskEvent("CAMPAIGN", "c1", 50.0, RiskLevel.HIGH, base_time + timedelta(minutes=i))
        engine.record_risk_event(event)

    alerts = engine.get_current_alerts()
    assert len(alerts) == 1
    assert alerts[0].alert_level == RiskLevel.HIGH
    assert alerts[0].subject_type == "CAMPAIGN"

def test_alert_deduplication_and_escalation():
    engine = RiskAlertingEngine(score_threshold=50.0)
    base_time = datetime.now(timezone.utc)

    # First threshold crossing
    engine.record_risk_event(RiskEvent("PERSONA", "p1", 60.0, RiskLevel.HIGH, base_time))

    alerts = engine.get_current_alerts()
    assert len(alerts) == 1
    assert alerts[0].alert_level == RiskLevel.HIGH
    alert_id = alerts[0].alert_id

    # Second event pushes score to 120 (Critical). Should escalate same alert.
    engine.record_risk_event(RiskEvent("PERSONA", "p1", 60.0, RiskLevel.HIGH, base_time + timedelta(minutes=1)))

    alerts = engine.get_current_alerts()
    assert len(alerts) == 1 # Deduplicated
    assert alerts[0].alert_id == alert_id
    assert alerts[0].alert_level == RiskLevel.CRITICAL

def test_alert_state_transition():
    engine = RiskAlertingEngine(score_threshold=50.0)
    base_time = datetime.now(timezone.utc)

    engine.record_risk_event(RiskEvent("PERSONA", "p1", 60.0, RiskLevel.HIGH, base_time))
    alerts = engine.get_current_alerts()
    alert_id = alerts[0].alert_id

    engine.update_alert_state(alert_id, AlertState.IN_REVIEW, "analyst_1", "Looking into it")

    alerts = engine.get_current_alerts()
    assert alerts[0].state == AlertState.IN_REVIEW
    assert len(alerts[0].state_history) == 1
    assert alerts[0].state_history[0]["new_state"] == "IN_REVIEW"
