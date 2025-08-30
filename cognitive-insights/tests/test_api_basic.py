from __future__ import annotations

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app.main import app
from fastapi.testclient import TestClient


def test_analyze_basic(sample_items):
    client = TestClient(app)
    resp = client.post("/analyze", json={"items": sample_items})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    for item in data:
        s_total = sum(item["sentiment"].values())
        e_total = sum(item["emotion"].values())
        assert abs(s_total - 1) < 1e-6
        assert abs(e_total - 1) < 1e-6
        assert item["bias_indicators"]
