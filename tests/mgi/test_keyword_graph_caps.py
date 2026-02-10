import pytest
import os
from summit.mgi.keyword_graph import build_edges
from summit.mgi.config import MGIConfig
from dataclasses import field, dataclass

# Mock config for testing
@dataclass(frozen=True)
class MockConfig(MGIConfig):
    keyword_max_degree: int = 2

def test_keyword_graph_caps():
    # Setup chunks
    # "apple" appears in 3 chunks. Cap is 2.
    chunks = [
        {"id": "c1", "text": "apple banana"},
        {"id": "c2", "text": "apple cherry"},
        {"id": "c3", "text": "apple date"},
    ]

    # Create config with cap=2
    # We can override the field directly or use a mock
    # Since MGIConfig uses default_factory, we can't easily init with values unless we change the class
    # or subclass it. Subclassing works if validation allows.
    # Actually, we can just instantiate MGIConfig and rely on env vars, OR
    # simply modify the object? No, it's frozen.
    # But wait, MGIConfig fields are fields, not init args?
    # No, dataclass generates __init__ with args for all fields.
    # So MGIConfig(keyword_max_degree=2) SHOULD work.

    config = MGIConfig(keyword_max_degree=2)

    edges = build_edges(chunks, config)

    # Check edges
    # c1 -> apple
    # c1 -> banana
    # c2 -> apple
    # c2 -> cherry
    # c3 -> date
    # c3 -> apple (SHOULD BE DROPPED)

    apple_edges = [e for e in edges if e["keyword"] == "apple"]
    assert len(apple_edges) == 2
    assert apple_edges[0]["chunk_id"] == "c1"
    assert apple_edges[1]["chunk_id"] == "c2"

    banana_edges = [e for e in edges if e["keyword"] == "banana"]
    assert len(banana_edges) == 1

    # Total edges: 2 (apple) + 1 (banana) + 1 (cherry) + 1 (date) = 5
    assert len(edges) == 5

def test_determinism():
    chunks = [
        {"id": "c1", "text": "zebra apple"},
    ]
    config = MGIConfig()

    edges1 = build_edges(chunks, config)
    edges2 = build_edges(chunks, config)

    assert edges1 == edges2
    # Ensure sorted order within chunk: apple before zebra
    assert edges1[0]["keyword"] == "apple"
    assert edges1[1]["keyword"] == "zebra"
