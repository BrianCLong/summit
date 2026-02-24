import pytest
import json
import os
from summit.osint.summarize_with_deltas import ContextAwareSummarizer

def test_summary_list_truncation():
    summarizer = ContextAwareSummarizer()
    items = ["One", "Two", "Three", "Four", "Five"]
    result = summarizer.summarize_list(items, max_items=2)

    assert "One, Two" in result["summary_text"]
    assert result["context_deltas"]["omitted_count"] == 3
    assert "Omitted: Three" in result["context_deltas"]["details"][0]

def test_summary_text_truncation():
    summarizer = ContextAwareSummarizer()
    text = "A" * 200
    result = summarizer.summarize_text(text, max_chars=100)

    assert len(result["summary_text"]) == 103 # 100 + "..."
    assert result["context_deltas"]["omitted_count"] == 100

def test_fixture_delta():
    fixture_path = os.path.join(os.path.dirname(__file__), "../fixtures/summaries/context_delta_case.json")
    if not os.path.exists(fixture_path):
        pytest.skip("Fixture not found")

    with open(fixture_path, 'r') as f:
        data = json.load(f)

    summarizer = ContextAwareSummarizer()
    result = summarizer.summarize_list(data["items"], max_items=data["max_items"])

    assert result["context_deltas"]["omitted_count"] == 2 # 5 - 3
