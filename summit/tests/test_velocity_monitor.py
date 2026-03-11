import pytest
import time
import asyncio
from unittest.mock import patch, MagicMock
from summit.alerts.velocity_monitor import VelocityMonitor

def test_compute_velocity():
    monitor = VelocityMonitor()
    data = {
        "new_posts": 150,
        "new_amplifiers": 60,
        "platforms": ["twitter", "facebook", "telegram"],
        "time_window_hours": 1.5
    }

    metrics = monitor.compute_velocity(data)

    assert metrics["posts_per_hour"] == 100.0
    assert metrics["unique_amplifiers_per_hour"] == 40.0
    assert metrics["platform_spread_count"] == 3

def test_check_thresholds():
    monitor = VelocityMonitor()
    monitor.set_thresholds("political", 200, 100, 4)

    # Should not alert (all under)
    metrics1 = {
        "posts_per_hour": 150,
        "unique_amplifiers_per_hour": 50,
        "platform_spread_count": 3
    }
    assert not monitor.check_thresholds("political", metrics1)

    # Should alert (posts_per_hour over)
    metrics2 = {
        "posts_per_hour": 250,
        "unique_amplifiers_per_hour": 50,
        "platform_spread_count": 3
    }
    assert monitor.check_thresholds("political", metrics2)

    # Should alert (platform count over)
    metrics3 = {
        "posts_per_hour": 150,
        "unique_amplifiers_per_hour": 50,
        "platform_spread_count": 5
    }
    assert monitor.check_thresholds("political", metrics3)

def test_should_alert_deduplication():
    monitor = VelocityMonitor()
    narrative_id = "test_narrative"

    # First time should alert
    assert monitor.should_alert(narrative_id)

    # Simulate an alert being triggered
    monitor.last_alert_times[narrative_id] = time.time()

    # Second time within window should not alert
    assert not monitor.should_alert(narrative_id)

    # Second time outside window should alert
    monitor.last_alert_times[narrative_id] = time.time() - 400  # 400s ago (window is 300)
    assert monitor.should_alert(narrative_id)

@pytest.mark.asyncio
async def test_trigger_alert():
    monitor = VelocityMonitor()
    narrative_id = "test_narrative"
    category = "default"
    metrics = {"posts_per_hour": 150, "unique_amplifiers_per_hour": 60, "platform_spread_count": 4}

    # Mock webhook and websocket
    monitor.webhooks = ["http://fake-webhook.com"]
    mock_ws = MagicMock()
    mock_ws.send_json = MagicMock(return_value=asyncio.Future())
    mock_ws.send_json.return_value.set_result(None)
    monitor.websockets = [mock_ws]

    with patch("requests.post") as mock_post:
        await monitor.trigger_alert(narrative_id, category, metrics)

        # Verify history
        assert len(monitor.alert_history) == 1
        assert monitor.alert_history[0]["narrative_id"] == narrative_id

        # Verify deduplication time updated
        assert narrative_id in monitor.last_alert_times

        # Verify webhook called
        mock_post.assert_called_once()

        # Verify websocket called
        mock_ws.send_json.assert_called_once()

@pytest.mark.asyncio
async def test_process_cluster_data():
    monitor = VelocityMonitor()

    narrative_id = "test_narrative"
    category = "default"

    # Data that will exceed default thresholds (100, 50, 3)
    data = {
        "new_posts": 150,
        "new_amplifiers": 60,
        "platforms": ["t1", "t2", "t3", "t4"],
        "time_window_hours": 1.0
    }

    with patch.object(monitor, "trigger_alert") as mock_trigger:
        await monitor.process_cluster_data(narrative_id, category, data)
        mock_trigger.assert_called_once()

@pytest.mark.asyncio
async def test_test_harness():
    monitor = VelocityMonitor()

    # Custom thresholds for testing harness
    monitor.set_thresholds("harness", 50, 20, 2)

    mock_data = [
        {"narrative_id": "n1", "category": "harness", "cluster_growth_data": {"new_posts": 60, "new_amplifiers": 10, "platforms": ["p1", "p2"], "time_window_hours": 1.0}},
        {"narrative_id": "n2", "category": "harness", "cluster_growth_data": {"new_posts": 10, "new_amplifiers": 5, "platforms": ["p1"], "time_window_hours": 1.0}},
    ]

    def mock_data_source():
        return mock_data

    # We can't run the infinite loop but we can manually trigger the processing part
    for item in mock_data:
        await monitor.process_cluster_data(item["narrative_id"], item["category"], item["cluster_growth_data"])

    # n1 exceeds new_posts limit, n2 does not
    assert len(monitor.alert_history) == 1
    assert monitor.alert_history[0]["narrative_id"] == "n1"
