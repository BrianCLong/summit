import os
from contextlib import contextmanager

import pandas as pd
from fastapi.testclient import TestClient

import cdis.api as api_module
from cdis.api import app


@contextmanager
def feature_flag(enabled: bool):
    original = os.environ.get("CDIS_FEATURE_ENABLED")
    os.environ["CDIS_FEATURE_ENABLED"] = "true" if enabled else "false"
    api_module.get_settings.cache_clear()
    try:
        yield
    finally:
        if original is None:
            os.environ.pop("CDIS_FEATURE_ENABLED", None)
        else:
            os.environ["CDIS_FEATURE_ENABLED"] = original
        api_module.get_settings.cache_clear()


def test_feature_flag_blocks_access():
    with feature_flag(False):
        client = TestClient(app)
        response = client.post("/discover", json={"records": []})
        assert response.status_code == 403


def test_discover_and_intervene_flow():
    with feature_flag(True):
        client = TestClient(app)
        df = pd.read_csv("ai/cdis/tests/fixtures/synthetic_data.csv")
        payload = {"records": df.to_dict(orient="records"), "algorithm": "pc"}
        discover = client.post("/discover", json=payload)
        assert discover.status_code == 200
        sim_id = discover.json()["simId"]

        intervention = client.post(
            "/intervene", json={"simId": sim_id, "interventions": {"treatment": 1.0}}
        )
        assert intervention.status_code == 200
        body = intervention.json()
        assert "delta" in body
        assert any(abs(v) > 0 for v in body["delta"].values())

        explain = client.get(f"/explain/{sim_id}")
        assert explain.status_code == 200
        assert explain.json()["simId"] == sim_id
