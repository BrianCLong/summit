from fastapi.testclient import TestClient
from main import app
client = TestClient(app)

def test_autocreate_case():
  r = client.post("/cases/autocreate", json={"seed_accounts":["acc_1","acc_2"], "reason":"test"})
  assert r.status_code == 200
  body = r.json()
  assert "id" in body and body["reason"] == "test"