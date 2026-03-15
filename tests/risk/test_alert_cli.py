import pytest
from unittest.mock import MagicMock
from summit.cli.alerts import RiskAlertCLI
from summit.risk.alerting_engine import RiskAlert
from summit.risk.persona_campaign_risk import RiskLevel
from datetime import timedelta, datetime, timezone

def test_list_alerts(capsys):
    engine = MagicMock()
    cli = RiskAlertCLI(engine)

    # Mock some alerts
    alert1 = RiskAlert(
        alert_id="ALT-PERSONA-123",
        subject_type="PERSONA",
        subject_id="p1",
        alert_level=RiskLevel.HIGH,
        window=timedelta(hours=24),
        reasons=["High deception"],
        timestamp=datetime.now(timezone.utc),
        status="NEW"
    )

    engine.get_current_alerts.return_value = [alert1]

    args = type('Args', (), {'type': None})
    cli.list_alerts(args)

    captured = capsys.readouterr()
    assert "[ALT-PERSONA-123]" in captured.out
    assert "High deception" in captured.out

def test_update_alert(capsys):
    engine = MagicMock()
    cli = RiskAlertCLI(engine)

    engine.update_alert_status.return_value = True

    args = type('Args', (), {'id': 'ALT-PERSONA-123', 'status': 'in_review'})
    cli.update_alert(args)

    engine.update_alert_status.assert_called_once_with('ALT-PERSONA-123', 'IN_REVIEW')

    captured = capsys.readouterr()
    assert "Updated ALT-PERSONA-123 to IN_REVIEW" in captured.out
