import pytest
from fastapi.testclient import TestClient

from services.search.src.main import app, reset_state


def setup_function() -> None:
    reset_state()


def test_search_returns_hits_and_facets() -> None:
    client = TestClient(app)
    response = client.post(
        "/search/query",
        json={
            "query": "analytics",
            "facets": ["language", "category"],
            "language": "any",
            "boosts": {"tags": 0.5},
            "fuzziness": 1,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["hits"]
    assert payload["facets"]
    assert payload["backend"] == "mock"
    assert payload["total"] >= len(payload["hits"])


def test_suggestions_use_prefix_and_language_filter() -> None:
    client = TestClient(app)
    response = client.get("/search/suggest", params={"q": "gr", "language": "en"})
    assert response.status_code == 200
    suggestions = response.json()
    assert suggestions
    assert all(suggestion["text"] for suggestion in suggestions)


def test_analytics_accumulates_queries() -> None:
    client = TestClient(app)
    client.post("/search/query", json={"query": "copilot", "language": "en"})
    client.post("/search/query", json={"query": "copilot", "language": "en"})

    analytics_response = client.get("/search/analytics")
    assert analytics_response.status_code == 200
    snapshot = analytics_response.json()
    assert snapshot["totalQueries"] >= 2
    assert snapshot["languages"].get("en") >= 2


def test_dual_write_produces_consistent_results(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SEARCH_REINDEX_V1", "1")
    monkeypatch.setenv("SEARCH_DUAL_WRITE", "1")
    reset_state()
    client = TestClient(app)

    start_response = client.post("/search/reindex/start", json={"label": "shadow", "batchSize": 2})
    assert start_response.status_code == 200

    event = {
        "sequence": 1,
        "action": "upsert",
        "document": {
            "id": "doc-99",
            "title": "dual write index pipeline",
            "text": "dual-write keeps both indexes in sync for migration safety",
            "language": "en",
            "category": "intelligence",
            "tags": ["reindex"],
        },
    }
    enqueue_response = client.post("/search/reindex/events", json={"events": [event]})
    assert enqueue_response.status_code == 200

    run_response = client.post("/search/reindex/run", json={"batchSize": 5})
    assert run_response.status_code == 200
    assert run_response.json()["lag"] == 0

    payload = {
        "query": "dual write",
        "language": "en",
        "backend": "mock",
        "size": 10,
        "facets": ["category"],
    }
    active_search = client.post("/search/query", json=payload)
    assert active_search.status_code == 200
    assert any(hit["id"] == "doc-99" for hit in active_search.json()["hits"])

    cutover_response = client.post("/search/reindex/cutover", json={"label": "shadow"})
    assert cutover_response.status_code == 200
    assert cutover_response.json()["activeIndex"] == "shadow"

    shadow_search = client.post("/search/query", json=payload)
    assert shadow_search.status_code == 200
    assert any(hit["id"] == "doc-99" for hit in shadow_search.json()["hits"])


def test_cutover_and_rollback_are_single_flip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SEARCH_REINDEX_V1", "1")
    monkeypatch.setenv("SEARCH_DUAL_WRITE", "1")
    reset_state()
    client = TestClient(app)

    client.post("/search/reindex/start", json={"label": "blue", "batchSize": 3})
    event = {
        "sequence": 1,
        "action": "upsert",
        "document": {
            "id": "doc-5",
            "title": "AI copilot suggestions for analysts",
            "text": "Cutover ready copilot content",
            "language": "en",
            "category": "copilot",
            "tags": ["copilot", "cutover"],
        },
    }
    client.post("/search/reindex/events", json={"events": [event]})
    resume = client.post("/search/reindex/run", json={"batchSize": 10})
    assert resume.status_code == 200

    cutover = client.post("/search/reindex/cutover", json={"label": "blue"})
    assert cutover.status_code == 200
    assert cutover.json()["activeIndex"] == "blue"

    rollback = client.post("/search/reindex/rollback")
    assert rollback.status_code == 200
    assert rollback.json()["activeIndex"] == "primary"

    verification = client.post(
        "/search/query",
        json={"query": "copilot", "language": "en", "backend": "mock", "size": 5},
    )
    assert verification.status_code == 200
    assert any(hit["id"] == "doc-5" for hit in verification.json()["hits"])
