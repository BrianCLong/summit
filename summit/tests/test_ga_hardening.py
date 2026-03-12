import pytest
from fastapi.testclient import TestClient
from summit.main import app
import structlog
from server.src.observability.logging_middleware import correlation_id_ctx

client = TestClient(app)

def test_health_endpoints():
    # Live endpoint should always be 200
    response = client.get("/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}

    # Health/Ready endpoints (might be 503 if DB/Redis not running, but let's check structure)
    response = client.get("/health")
    # We expect 503 since we don't have real DB/Redis in test env usually,
    # but the structure should be correct.
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "dependencies" in data
    assert "database" in data["dependencies"]
    assert "redis" in data["dependencies"]

def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text

def test_correlation_id_middleware():
    # Test with provided correlation ID
    corr_id = "test-corr-id"
    response = client.get("/live", headers={"X-Correlation-ID": corr_id})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == corr_id

    # Test with generated correlation ID
    response = client.get("/live")
    assert response.status_code == 200
    assert "X-Correlation-ID" in response.headers
    generated_id = response.headers["X-Correlation-ID"]
    assert len(generated_id) > 0

def test_graphrag_instrumentation():
    from server.src.ai.rag.graph_rag import query_graph_with_rag

    # Mock subgraph context
    subgraph = {"nodes": ["Alice"]}
    result = query_graph_with_rag("Who is Alice?", subgraph)

    assert "answer" in result
    assert "citations" in result
    # We know Alice is in mock graph
    assert len(result["citations"]) > 0
