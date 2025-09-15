import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[2]))
from analysis.clra import CLRAHighlight, CognitiveLoadReductionAssistant


@pytest.fixture
def assistant():
    return CognitiveLoadReductionAssistant()


def test_summarize_feed_first_mode(assistant):
    text = "Sentence one. Sentence two. Sentence three. Sentence four."
    assert (
        assistant.summarize_feed(text, max_sentences=2, mode="first")
        == "Sentence one. Sentence two."
    )


def test_summarize_feed_frequency_mode(assistant):
    text = "malware malware detected. benign activity. another note."
    summary = assistant.summarize_feed(text, max_sentences=1, mode="frequency")
    assert summary == "malware malware detected."


def test_highlight_changes_added_and_removed(assistant):
    old_graph = {"A": ["B"], "C": ["D"]}
    new_graph = {"A": ["B", "C"]}
    highlights = assistant.highlight_changes(old_graph, new_graph)
    assert (
        CLRAHighlight(
            source="A",
            target="C",
            change_type="added",
            description="New link found between A and C",
        )
        in highlights
    )
    assert (
        CLRAHighlight(
            source="C",
            target="D",
            change_type="removed",
            description="Link removed between C and D",
        )
        in highlights
    )


def test_prioritize_events_with_weights(assistant):
    events = ["normal update", "critical patch", "urgent response"]
    weights = {"urgent": 5, "critical": 3}
    assert assistant.prioritize_events(events, weights) == [
        "urgent response",
        "critical patch",
        "normal update",
    ]


def test_link_context_sorted_unique(assistant):
    graph = {"A": ["B", "C"], "B": ["D", "E"], "C": ["D"], "D": [], "E": []}
    ctx = assistant.link_context(graph, "A")
    assert ctx == {"first_degree": ["B", "C"], "second_degree": ["D", "E"]}


def test_trending_entities(assistant):
    feeds = [
        "Alpha malware campaign detected in region.",
        "Beta malware variant observed.",
        "Alpha infrastructure expanding.",
    ]
    assert assistant.trending_entities(feeds, top_n=1) == ["alpha"]
