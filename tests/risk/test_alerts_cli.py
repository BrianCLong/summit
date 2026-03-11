import pytest
from summit.cli.alerts import main
import sys

def test_cli_list(capsys):
    # Call list, the mock engine gets populated with 1 alert
    result = main(["alerts.py", "list"])
    assert result == 0

    captured = capsys.readouterr()
    assert "Found 1 alerts:" in captured.out
    assert "Subject:      PERSONA / usr_1234" in captured.out
    assert "Level:        HIGH" in captured.out

def test_cli_update_not_found(capsys):
    # Try updating a non-existent alert
    result = main(["alerts.py", "update", "invalid_id", "--state", "IN_REVIEW"])
    assert result == 1

    captured = capsys.readouterr()
    assert "Error: Alert invalid_id not found" in captured.out

def test_cli_update_success(capsys, monkeypatch):
    # We need to capture the alert ID from list to update it, because UUIDs are random
    import summit.cli.alerts

    # ensure it's populated
    summit.cli.alerts._engine._alerts.clear()
    summit.cli.alerts._engine._events.clear()
    summit.cli.alerts.populate_mock_data()

    alerts = summit.cli.alerts._engine.get_current_alerts()
    assert len(alerts) == 1
    alert_id = alerts[0].alert_id

    result = main(["alerts.py", "update", alert_id, "--state", "IN_REVIEW"])
    assert result == 0

    captured = capsys.readouterr()
    assert f"Successfully updated alert {alert_id} to IN_REVIEW." in captured.out
