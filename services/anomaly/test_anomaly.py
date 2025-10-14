from fastapi.testclient import TestClient

from fastapi.testclient import TestClient

from .api import app, engine


def _configure_default_detector(client: TestClient) -> None:
    engine.alert_client.events.clear()
    payload = {
        "configs": [
            {
                "model_id": "metrics-v1",
                "model_version": "1.0",
                "detector": "zscore",
                "params": {
                    "feature_names": ["latency_ms", "error_rate"],
                    "mean": [100, 5],
                    "std": [5, 1],
                    "threshold": 1.5,
                    "min_score_ratio": 0.05,
                },
                "threshold_strategy": "adaptive",
                "adaptive_sensitivity": 2.5,
                "history_window": 64,
                "cooldown": 1,
                "alert_channels": ["pagerduty", "slack"],
                "stream_type": "metrics",
            }
        ]
    }
    response = client.post("/anomaly/config", json=payload)
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_anomaly_detection_end_to_end():
    client = TestClient(app)
    _configure_default_detector(client)

    baseline = {
        "model_id": "metrics-v1",
        "records": [
            {"latency_ms": 101, "error_rate": 5},
            {"latency_ms": 98, "error_rate": 5.1},
            {"latency_ms": 100, "error_rate": 4.9},
        ],
        "labels": [0, 0, 0],
        "horizon": 2,
    }
    warm_response = client.post("/anomaly/score", json=baseline)
    assert warm_response.status_code == 200
    warm_data = warm_response.json()
    assert warm_data["anomalies"] == []
    assert warm_data["evaluation"]["support"] == 0

    anomaly_payload = {
        "model_id": "metrics-v1",
        "records": [
            {"latency_ms": 99, "error_rate": 5.2},
            {"latency_ms": 102, "error_rate": 5.4},
            {"latency_ms": 180, "error_rate": 18},
        ],
        "labels": [0, 0, 1],
        "horizon": 4,
    }
    anomaly_response = client.post("/anomaly/score", json=anomaly_payload)
    assert anomaly_response.status_code == 200
    anomaly_data = anomaly_response.json()

    assert len(anomaly_data["anomalies"]) == 1
    detected = anomaly_data["anomalies"][0]
    assert detected["index"] == 2
    assert any("latency" in feature for feature in detected["rationale"]["features"])
    assert "latency" in detected["root_cause"].lower()
    assert anomaly_data["evaluation"]["precision"] >= 0.9
    assert anomaly_data["incidents"], "Expected automated incident creation"
    assert len(anomaly_data["prediction"]["forecast"]) == 4
    assert anomaly_data["trend"]["classification"] in {
        "increasing",
        "decreasing",
        "stable",
        "insufficient-data",
    }
    assert anomaly_data["false_positive_reduction"]["suppressed"] >= 0

    alerts_response = client.get("/anomaly/alerts")
    assert alerts_response.status_code == 200
    alerts = alerts_response.json()["alerts"]
    assert len(alerts) == 1
    assert alerts[0]["model_id"] == "metrics-v1"
    assert alerts[0]["severity"] in {"warning", "minor", "major", "critical"}


def test_alert_cooldown_prevents_duplicate_incidents():
    client = TestClient(app)
    _configure_default_detector(client)

    anomaly_payload = {
        "model_id": "metrics-v1",
        "records": [
            {"latency_ms": 110, "error_rate": 6},
            {"latency_ms": 185, "error_rate": 20},
        ],
        "labels": [0, 1],
    }
    first = client.post("/anomaly/score", json=anomaly_payload)
    assert first.status_code == 200
    first_alerts = client.get("/anomaly/alerts").json()["alerts"]
    assert len(first_alerts) == 1

    second = client.post("/anomaly/score", json=anomaly_payload)
    assert second.status_code == 200
    second_alerts = client.get("/anomaly/alerts").json()["alerts"]
    assert len(second_alerts) == 1, "Cooldown should suppress immediate duplicate incidents"


def test_unknown_model_returns_404():
    client = TestClient(app)
    response = client.post(
        "/anomaly/score",
        json={"model_id": "missing", "records": [], "labels": []},
    )
    assert response.status_code == 404
