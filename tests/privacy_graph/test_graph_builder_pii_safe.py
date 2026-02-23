import pytest

from summit.privacy_graph.graph_builder import build_graph
from summit.privacy_graph.types import GraphEvent


def test_filters_unsafe_features():
    events = [
        GraphEvent(
            src="user1",
            dst="user2",
            ts_bucket=100,
            features={
                "bytes": 500,
                "email": 12345,  # even if numeric, key not in allowlist
                "packets": 5
            }
        )
    ]
    frame = build_graph(events)
    assert len(frame.edges) == 1
    assert "email" not in frame.edge_features[0]
    assert frame.edge_features[0]["bytes"] == 500.0

def test_nodes_are_sorted_deterministic():
    events = [
        GraphEvent(src="z-node", dst="a-node", ts_bucket=1, features={})
    ]
    frame = build_graph(events)
    assert frame.nodes == ["a-node", "z-node"]

def test_coerces_to_float():
    events = [
        GraphEvent(src="u1", dst="u2", ts_bucket=1, features={"bytes": 100}) # int
    ]
    frame = build_graph(events)
    assert isinstance(frame.edge_features[0]["bytes"], float)
