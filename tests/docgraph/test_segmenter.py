import os
import uuid

import pytest

from pipelines.docgraph.entities import extract_entities
from pipelines.docgraph.graph_builder import build_graph
from pipelines.docgraph.segmenter import segment_document


def test_segment_document():
    text = "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
    segments = segment_document(text)
    assert len(segments) == 3
    assert segments[0]["text"] == "Paragraph 1"
    assert segments[1]["text"] == "Paragraph 2"
    assert segments[2]["text"] == "Paragraph 3"

def test_extract_entities():
    text = "Test Entity here\n\nAnother One"
    segments = segment_document(text)
    entities = extract_entities(text, segments)

    # We expect 'Test', 'Entity', 'Another'
    texts = [e["text"] for e in entities]
    assert "Test" in texts
    assert "Entity" in texts
    assert "Another" in texts

def test_build_graph():
    os.environ["SUMMIT_ENABLE_DOCGRAPH"] = "ON"
    text = "Test Entity here\n\nAnother One"
    graph = build_graph(text)
    assert graph is not None
    assert "segments" in graph
    assert "entities" in graph
    assert "edges" in graph

    assert len(graph["segments"]) == 2
    assert len(graph["entities"]) == 3
