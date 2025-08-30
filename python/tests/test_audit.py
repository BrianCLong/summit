import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.main import app


def test_audit_log_written(tmp_path, monkeypatch):
    log_file = tmp_path / "audit.log"
    monkeypatch.setenv("AUDIT_LOG_PATH", str(log_file))
    client = TestClient(app)
    client.get("/")
    assert log_file.exists()
    data = json.loads(log_file.read_text().strip())
    assert data["action"] == "view"
    assert data["target"] == "root"


def test_export_json_and_csv(tmp_path, monkeypatch):
    log_file = tmp_path / "audit.log"
    monkeypatch.setenv("AUDIT_LOG_PATH", str(log_file))
    client = TestClient(app)
    client.get("/")
    # JSON export
    res = client.get("/audit/export", params={"investigation_id": "123", "format": "JSON"})
    assert res.status_code == 200
    assert res.json()["entries"][0]["action"] == "view"
    # CSV export
    res = client.get("/audit/export", params={"investigation_id": "123", "format": "CSV"})
    assert res.status_code == 200
    assert "action" in res.text
