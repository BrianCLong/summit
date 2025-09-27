from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "connectors" / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import main as connectors_main  # type: ignore

app = connectors_main.app

client = TestClient(app)


def test_run_with_dq_failure(tmp_path: Path):
    csv_path = Path(__file__).parent / "data" / "people.csv"
    resp = client.post(
        "/connector/create",
        json={"name": "people", "kind": "FILE", "config": {"path": str(csv_path)}},
    )
    connector_id = resp.json()["id"]

    run_resp = client.post(
        "/run/start",
        json={"connectorId": connector_id, "dq_field": "email"},
    )
    data = run_resp.json()
    assert data["status"] == "FAILED"
    assert data["dq_failures"]


def test_successful_run(tmp_path: Path):
    csv_path = Path(__file__).parent / "data" / "people.csv"
    resp = client.post(
        "/connector/create",
        json={"name": "people2", "kind": "FILE", "config": {"path": str(csv_path)}},
    )
    connector_id = resp.json()["id"]

    run_resp = client.post(
        "/run/start",
        json={"connectorId": connector_id, "dq_field": "name"},
    )
    data = run_resp.json()
    assert data["status"] == "SUCCEEDED"
    assert data["stats"]["rowCount"] == 2
