from unittest.mock import MagicMock

from app.main import app


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_detailed_in_memory(client):
    # Uses InMemoryGraph/Store from fixture, which have no health_check method
    # Should default to healthy
    resp = client.get("/health/detailed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["services"]["neo4j"] == "healthy"
    assert data["services"]["postgres"] == "healthy"


def test_health_detailed_neo4j_unhealthy(client):
    # Save original state
    orig_graph = app.state.graph

    try:
        mock_graph = MagicMock()
        mock_graph.health_check.return_value = False
        app.state.graph = mock_graph

        resp = client.get("/health/detailed")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "unhealthy"
        assert data["services"]["neo4j"] == "unhealthy"
    finally:
        app.state.graph = orig_graph


def test_health_detailed_postgres_unhealthy(client):
    # Save original state
    orig_prov = app.state.provenance_store

    try:
        mock_prov = MagicMock()
        mock_prov.health_check.return_value = False
        app.state.provenance_store = mock_prov

        resp = client.get("/health/detailed")
        assert resp.status_code == 503
        data = resp.json()
        assert data["status"] == "unhealthy"
        assert data["services"]["postgres"] == "unhealthy"
    finally:
        app.state.provenance_store = orig_prov
