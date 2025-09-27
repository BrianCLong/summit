from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Generator
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

import pytest
from fastapi.testclient import TestClient

from services.slice_reg.app import create_app
from services.slice_reg.registry import SliceRegistry


@pytest.fixture()
def temp_registry(tmp_path: Path) -> Generator[SliceRegistry, None, None]:
    registry = SliceRegistry(tmp_path)
    yield registry


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch, temp_registry: SliceRegistry) -> TestClient:
    def _get_registry() -> SliceRegistry:
        return temp_registry

    from importlib import import_module

    app_module = import_module("services.slice_reg.app")

    monkeypatch.setattr(app_module, "get_registry", _get_registry)
    return TestClient(create_app())


def test_upsert_and_get_slice_via_api(client: TestClient) -> None:
    payload = {
        "version": "v1",
        "members": ["u1", "u2"],
        "metadata": {"stratum": "expert"},
        "source": "curation-pipeline",
    }
    response = client.post("/slices/expert", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["membership_hash"]
    assert data["provenance_hash"]

    get_response = client.get("/slices/expert/v1")
    assert get_response.status_code == 200
    assert get_response.json()["members"] == ["u1", "u2"]


def test_diff_endpoint_returns_membership_delta(client: TestClient) -> None:
    first = {
        "version": "v1",
        "members": ["u1", "u2"],
        "metadata": {},
    }
    second = {
        "version": "v2",
        "members": ["u2", "u3"],
        "metadata": {},
    }
    client.post("/slices/expert", json=first)
    client.post("/slices/expert", json=second)

    response = client.get("/slices/expert/v1/diff/v2")
    assert response.status_code == 200
    payload = response.json()
    assert payload["added"] == ["u3"]
    assert payload["removed"] == ["u1"]


def test_coverage_endpoint_matches_replay(client: TestClient) -> None:
    payload = {
        "version": "v1",
        "members": ["s1", "s3"],
        "metadata": {"cohort": "stress"},
    }
    client.post("/slices/stress", json=payload)

    coverage_request = {
        "traffic_events": [
            {"id": "s1", "label": "spike", "weight": 2.0},
            {"id": "s2", "label": "baseline", "weight": 1.0},
            {"id": "s3", "label": "spike", "weight": 1.0},
        ]
    }
    response = client.post("/slices/stress/v1/coverage", json=coverage_request)
    assert response.status_code == 200
    payload = response.json()
    assert payload["coverage"] == pytest.approx(0.75)
    assert payload["label_coverage"]["spike"] == 1.0
