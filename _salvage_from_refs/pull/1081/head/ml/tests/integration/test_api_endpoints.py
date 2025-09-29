from fastapi.testclient import TestClient

from ml.app.main import api  # Assuming your FastAPI app is named 'api' in main.py

client = TestClient(api)


def test_health_endpoint():
    response = client.get("/health/quick")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_suggest_links_endpoint():
    # This is a simplified test. In a real scenario, you'd mock the Celery task.
    response = client.post(
        "/suggestLinks",
        headers={"Authorization": "Bearer valid-token"},  # Assuming valid token for auth
        json={
            "graph": {"edges": [["A", "B"], ["B", "C"]]},
            "model_name": "test_link_predictor",
            "task_mode": "predict",
            "focus_entity_id": "A",
        },
    )
    assert response.status_code == 200
    assert response.json()["queued"] is True
    assert "task_id" in response.json()


def test_detect_anomalies_endpoint():
    # This is a simplified test. In a real scenario, you'd mock the Celery task.
    response = client.post(
        "/detectAnomalies",
        headers={"Authorization": "Bearer valid-token"},  # Assuming valid token for auth
        json={
            "graph": {"edges": [["X", "Y"], ["Y", "Z"]]},
            "model_name": "test_anomaly_detector",
            "task_mode": "predict",
            "anomaly_threshold": 0.7,
        },
    )
    assert response.status_code == 200
    assert response.json()["queued"] is True
    assert "task_id" in response.json()


def test_unauthorized_access():
    response = client.post(
        "/suggestLinks",
        json={
            "graph": {"edges": [["A", "B"]]},
            "model_name": "test_link_predictor",
            "task_mode": "predict",
        },
    )
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]
