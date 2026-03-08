from datetime import datetime
import pytest
from unittest.mock import MagicMock, patch

from summit.memory.ingestion import ingest_moment
from summit.memory.moment import Moment
from summit.memory.policy import AmbientPolicy
from summit.memory.retrieval import MemoryRetriever


def test_policy_exclusion():
    policy = AmbientPolicy()

    # Allowed domains/apps
    assert policy.evaluate_exclusions("chrome", "github.com") == True
    assert policy.evaluate_exclusions("vscode", "file:///src/main.py") == True

    # Blocked apps
    assert policy.evaluate_exclusions("1password", "vault") == False
    assert policy.evaluate_exclusions("incognito_window", "google.com") == False

    # Blocked domains
    assert policy.evaluate_exclusions("safari", "bank.com/login") == False
    assert policy.evaluate_exclusions("firefox", "secure.com/auth") == False


def test_policy_redaction():
    policy = AmbientPolicy()

    raw_text = "Here is my info: 1234-5678-9012-3456 and password: supersecret and SSN 123-45-6789"
    redacted = policy.redact_sensitive_data(raw_text)

    assert "[REDACTED]" in redacted
    assert "1234-5678-9012-3456" not in redacted
    assert "supersecret" not in redacted
    assert "123-45-6789" not in redacted


def test_ingest_moment():
    policy = AmbientPolicy()

    # Test valid moment
    valid_data = {
        "source_app": "slack",
        "uri": "slack.com/channel/general",
        "title": "General discussion",
        "text": "Let's review the new PR.",
        "timestamp": datetime.now()
    }

    moment = ingest_moment(valid_data, policy)
    assert moment is not None
    assert isinstance(moment, Moment)
    assert moment.text == "Let's review the new PR."
    assert moment.source_app == "slack"
    assert moment.id is not None
    assert moment.content_hash is not None

    # Test blocked moment
    invalid_data = {
        "source_app": "1password",
        "uri": "app://vault",
        "text": "my password is test",
    }
    moment2 = ingest_moment(invalid_data, policy)
    assert moment2 is None


def test_retrieval_fallback():
    # Test without external DBs to ensure fallback mock works
    policy = AmbientPolicy()

    with patch('summit.memory.retrieval.QdrantClient', None), \
         patch('summit.memory.retrieval.GraphDatabase', None):

        retriever = MemoryRetriever()

        # Ingest some moments
        m1 = ingest_moment({
            "source_app": "chrome",
            "uri": "github.com/pr/123",
            "title": "PR 123",
            "text": "Added hybrid retrieval to the memory system",
            "timestamp": datetime(2023, 1, 1, 10, 0, 0)
        }, policy)

        m2 = ingest_moment({
            "source_app": "slack",
            "uri": "slack.com/channel/random",
            "title": "Random chat",
            "text": "Just having coffee, thinking about vector databases",
            "timestamp": datetime(2023, 1, 1, 12, 0, 0)
        }, policy)

        assert m1 is not None and m2 is not None

        # Insert moments
        retriever.insert(m1)
        retriever.insert(m2)

        # Search and verify citations
        results = retriever.search("hybrid")
        assert len(results) == 1
        assert results[0]["moment"].id == m1.id

        citation = results[0]["evidence_citation"]
        assert citation["source"] == "chrome"
        assert citation["uri"] == "github.com/pr/123"
        assert "timestamp" in citation

        # Check metrics
        assert "evaluation_metrics" in results[0]
        assert results[0]["evaluation_metrics"]["latency_ms"] >= 0

@patch('summit.memory.retrieval.QdrantClient')
@patch('summit.memory.retrieval.GraphDatabase')
def test_retrieval_with_mocked_dbs(mock_graph, mock_qdrant_class):
    policy = AmbientPolicy()

    # Mock Qdrant
    mock_qclient_instance = MagicMock()
    mock_qdrant_class.return_value = mock_qclient_instance

    # Mock Neo4j
    mock_driver_instance = MagicMock()
    mock_graph.driver.return_value = mock_driver_instance
    mock_session = MagicMock()
    mock_driver_instance.session.return_value.__enter__.return_value = mock_session

    # Create valid moments
    m1 = ingest_moment({
        "source_app": "chrome",
        "uri": "github.com/pr/123",
        "title": "PR 123",
        "text": "Testing hybrid retrieval with qdrant",
        "timestamp": datetime(2023, 1, 1, 10, 0, 0)
    }, policy)

    retriever = MemoryRetriever(qdrant_url="mock-url", neo4j_uri="bolt://localhost:7687", neo4j_auth=("neo4j", "pass"))
    retriever.insert(m1)

    # Verify insert calls
    assert mock_qclient_instance.upsert.called
    assert mock_session.run.called

    # Set up search mocks
    mock_hit = MagicMock()
    mock_hit.score = 0.8
    mock_hit.payload = {"id": m1.id}

    # Qdrant response mock
    mock_query_response = MagicMock()
    mock_query_response.points = [mock_hit]
    mock_qclient_instance.query_points.return_value = mock_query_response

    # Neo4j response mock
    mock_session.run.return_value = [{"id": m1.id, "graph_score": 1.0}]

    results = retriever.search("qdrant")

    assert len(results) == 1
    assert results[0]["moment"].id == m1.id
    assert results[0]["score"] == (0.8 * 0.7) + (1.0 * 0.3)
    assert "evaluation_metrics" in results[0]
