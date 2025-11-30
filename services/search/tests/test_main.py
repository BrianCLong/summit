from fastapi.testclient import TestClient

from services.search.src.main import analytics, app


def setup_function() -> None:
    analytics.reset()


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
