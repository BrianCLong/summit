import pytest
import json
from pathlib import Path
from summit.security.cogres.graph.validator import GraphValidator

SCHEMA_PATH = Path(__file__).parent / "schema.json"

@pytest.fixture
def schema():
    with open(SCHEMA_PATH, "r") as f:
        return json.load(f)

@pytest.fixture
def validator(schema):
    return GraphValidator(schema)

def test_valid_graph(validator):
    graph = {
        "nodes": [
            {"id": "a1", "type": "Actor"},
            {"id": "n1", "type": "Narrative"},
            {"id": "c1", "type": "Channel"}
        ],
        "edges": [
            {"type": "AMPLIFIES", "source": "a1", "target": "n1"},
            {"type": "TARGETS", "source": "n1", "target": "c1"}
        ]
    }
    valid, msg = validator.validate_full(graph)
    assert valid, msg

def test_invalid_node_type(validator):
    graph = {
        "nodes": [{"id": "x1", "type": "Unknown"}],
        "edges": []
    }
    valid, msg = validator.validate_full(graph)
    assert not valid
    assert "Unknown node type" in msg

def test_invalid_edge_type(validator):
    graph = {
        "nodes": [
            {"id": "a1", "type": "Actor"},
            {"id": "n1", "type": "Narrative"}
        ],
        "edges": [{"type": "UNKNOWN_EDGE", "source": "a1", "target": "n1"}]
    }
    valid, msg = validator.validate_full(graph)
    assert not valid
    assert "Unknown edge type" in msg

def test_invalid_edge_structure(validator):
    graph = {
        "nodes": [
            {"id": "a1", "type": "Actor"},
            {"id": "n1", "type": "Narrative"}
        ],
        "edges": [{"type": "AMPLIFIES", "source": "n1", "target": "a1"}] # Wrong direction
    }
    valid, msg = validator.validate_full(graph)
    assert not valid
    assert "source must be Actor" in msg
