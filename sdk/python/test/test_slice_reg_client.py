from __future__ import annotations

from typing import Any, Dict
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[3]
PYTHON_SDK_ROOT = REPO_ROOT / "sdk" / "python"
if str(PYTHON_SDK_ROOT) not in sys.path:
    sys.path.append(str(PYTHON_SDK_ROOT))

import httpx
import pytest

from slice_reg_sdk import SliceHandle, SliceRegClient


class _MockRegistry:
    def __init__(self) -> None:
        self.responses: Dict[str, Dict[str, Any]] = {}

    def add_response(self, method: str, path: str, payload: Dict[str, Any]) -> None:
        key = f"{method.upper()} {path}"
        self.responses[key] = payload

    def handler(self, request: httpx.Request) -> httpx.Response:
        key = f"{request.method} {request.url.path}"
        payload = self.responses.get(key)
        if payload is None:
            return httpx.Response(status_code=404)
        return httpx.Response(status_code=200, json=payload)


@pytest.fixture()
def client() -> SliceRegClient:
    registry = _MockRegistry()
    registry.add_response("GET", "/slices/fairness/v1", {"name": "fairness", "version": "v1", "members": ["1"]})
    registry.add_response(
        "GET",
        "/slices/fairness/v1/diff/v2",
        {"slice": "fairness", "added": ["2"], "removed": [], "unchanged": ["1"], "baseline": "v1", "candidate": "v2"},
    )
    registry.add_response(
        "POST",
        "/slices/fairness/v1/coverage",
        {
            "slice": {"name": "fairness", "version": "v1", "members": ["1"], "metadata": {}, "created_at": "2024-01-01T00:00:00+00:00", "source": None, "membership_hash": "abc", "provenance_hash": "def", "cardinality": 1},
            "traffic_total": 2.0,
            "captured_weight": 1.0,
            "coverage": 0.5,
            "label_totals": {"toxic": 2.0},
            "captured_by_label": {"toxic": 1.0},
            "label_coverage": {"toxic": 0.5},
        },
    )
    transport = httpx.MockTransport(registry.handler)
    client = SliceRegClient("https://slice-reg.local", client=httpx.Client(transport=transport, base_url="https://slice-reg.local"))
    return client


def test_get_slice_alias(client: SliceRegClient) -> None:
    payload = client.getSlice(SliceHandle(name="fairness", version="v1"))
    assert payload["version"] == "v1"
    assert payload["members"] == ["1"]


def test_diff(client: SliceRegClient) -> None:
    payload = client.diff("fairness", "v1", "v2")
    assert payload["added"] == ["2"]


def test_coverage(client: SliceRegClient) -> None:
    payload = client.coverage("fairness", "v1", [{"id": "1", "label": "toxic"}])
    assert payload["coverage"] == 0.5
