from __future__ import annotations

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.main import app
from fastapi.testclient import TestClient


def test_influence_query_rejected(sample_items):
    client = TestClient(app)
    resp = client.post("/analyze?influence=true", json={"items": sample_items})
    assert resp.status_code == 400


def test_influence_body_rejected(sample_items):
    client = TestClient(app)
    payload = {"items": sample_items, "influence_vectors": True}
    resp = client.post("/analyze", json=payload)
    assert resp.status_code == 400
