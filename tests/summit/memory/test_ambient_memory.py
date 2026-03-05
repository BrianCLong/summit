from datetime import datetime

import pytest

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


def test_retrieval():
    policy = AmbientPolicy()
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
