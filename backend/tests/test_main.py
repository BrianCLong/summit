from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to SummitThreat"}

def test_get_iocs():
    response = client.get("/api/v1/iocs")
    assert response.status_code == 200
    assert "iocs" in response.json()

def test_get_attack_surface():
    response = client.get("/api/v1/attack-surface")
    assert response.status_code == 200
    assert "assets" in response.json()

def test_get_deep_web_findings():
    response = client.get("/api/v1/deep-web")
    assert response.status_code == 200
    assert "findings" in response.json()
