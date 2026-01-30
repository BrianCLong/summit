import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path

service_path = Path(__file__).resolve().parents[2] / "context-pruner" / "src"
sys.path.insert(0, str(service_path))
from main import app  # noqa: E402


client = TestClient(app)


def test_highlight_basic_sentence_pruning():
    response = client.post(
        "/highlight",
        json={
            "query": "Alpha launch",
            "context": "Alpha launch succeeded. Beta launch failed.",
            "budget": 10,
            "return_metrics": True,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["kept_token_count"] > 0
    assert payload["compression_rate"] <= 1
    assert payload["model_version"].startswith("zilliz/")
    assert len(payload["sentence_scores"]) >= 1


def test_highlight_conflict_sets():
    response = client.post(
        "/highlight",
        json={
            "query": "Alpha launch",
            "context": "Alpha launch succeeded. Alpha launch did not succeed.",
            "return_metrics": False,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "conflict_sets" in payload


@pytest.mark.parametrize("granularity", ["sentence", "clause", "span"])
def test_highlight_granularity(granularity: str):
    response = client.post(
        "/highlight",
        json={
            "query": "Alpha",
            "context": "Alpha, beta, gamma; alpha persists.",
            "granularity": granularity,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["selected_sentences"]) >= 1
    if granularity != "sentence":
        assert payload["selected_spans"]
