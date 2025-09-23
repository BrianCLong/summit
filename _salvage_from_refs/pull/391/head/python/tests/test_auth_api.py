import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from apps.api.main import app

client = TestClient(app)

def get_token(username: str, password: str) -> str:
    response = client.post("/token", data={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

def test_login_and_access():
    token = get_token("alice", "wonderland")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/admin", headers=headers)
    assert res.status_code == 200
    assert res.json()["msg"] == "admin access"

def test_role_blocked():
    token = get_token("bob", "builder")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/admin", headers=headers)
    assert res.status_code == 403
