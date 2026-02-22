import pytest
import json
import os
from datetime import datetime, timedelta, timezone
from summit.osint.meta_alerts import MetaAlertMonitor

def test_quieting_detection():
    monitor = MetaAlertMonitor()
    alerts = [] # Empty
    window_start = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    result = monitor.analyze_alerts(alerts, window_start)
    assert len(result) == 1
    assert result[0]["type"] == "QUIETED"

def test_thrashing_detection():
    monitor = MetaAlertMonitor(thrashing_count=3)
    now = datetime.now(timezone.utc).isoformat()
    alerts = [
        {"timestamp": now, "severity": "info"},
        {"timestamp": now, "severity": "info"},
        {"timestamp": now, "severity": "info"}
    ]
    window_start = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    result = monitor.analyze_alerts(alerts, window_start)
    assert len(result) == 1
    assert result[0]["type"] == "THRASHING"

def test_normal_operation():
    monitor = MetaAlertMonitor(thrashing_count=5)
    now = datetime.now(timezone.utc).isoformat()
    alerts = [
        {"timestamp": now, "severity": "info"}
    ]
    window_start = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    result = monitor.analyze_alerts(alerts, window_start)
    assert len(result) == 0
