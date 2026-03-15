import pytest
from datetime import datetime, timedelta, timezone
from summit.risk.alerting_engine import AlertingEngine, RiskEvent
from summit.risk.persona_campaign_risk import RiskLevel

def test_alerting_engine_threshold():
    engine = AlertingEngine(window_hours=24, alert_threshold=75.0)

    event1 = RiskEvent(
        subject_type="PERSONA",
        subject_id="p1",
        risk_score=50.0,
        risk_level=RiskLevel.MEDIUM
    )
    alert1 = engine.record_risk_event(event1)
    assert alert1 is None  # Should not alert

    event2 = RiskEvent(
        subject_type="PERSONA",
        subject_id="p1",
        risk_score=80.0,
        risk_level=RiskLevel.HIGH
    )
    alert2 = engine.record_risk_event(event2)
    assert alert2 is not None
    assert alert2.subject_id == "p1"
    assert alert2.alert_level == RiskLevel.HIGH

def test_alerting_engine_deduplication():
    engine = AlertingEngine(window_hours=24, alert_threshold=75.0)

    event = RiskEvent(
        subject_type="CAMPAIGN",
        subject_id="c1",
        risk_score=95.0,
        risk_level=RiskLevel.CRITICAL
    )

    alert1 = engine.record_risk_event(event)
    assert alert1 is not None

    # Send same event again, should be deduplicated
    alert2 = engine.record_risk_event(event)
    assert alert2 is None

def test_alert_status_updates():
    engine = AlertingEngine(window_hours=24, alert_threshold=75.0)

    event = RiskEvent(
        subject_type="CAMPAIGN",
        subject_id="c1",
        risk_score=95.0,
        risk_level=RiskLevel.CRITICAL
    )

    alert = engine.record_risk_event(event)

    assert engine.update_alert_status(alert.alert_id, "IN_REVIEW") is True

    alerts = engine.get_current_alerts(status="IN_REVIEW")
    assert len(alerts) == 1
    assert alerts[0].alert_id == alert.alert_id
