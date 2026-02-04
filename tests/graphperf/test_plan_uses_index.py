import pytest
from unittest.mock import patch, MagicMock
from graphperf.querylib.anchor import QueryShaper

def test_generated_cypher_contains_hints():
    """Verify that QueryShaper injects hints when requested."""
    shaper = QueryShaper(use_hints=True)
    cypher, _ = shaper.anchored_evidence_shortest_path("test", "tgt_1")
    assert "USING TEXT INDEX s:Evidence(body)" in cypher

    shaper_no_hints = QueryShaper(use_hints=False)
    cypher_no, _ = shaper_no_hints.anchored_evidence_shortest_path("test", "tgt_1")
    assert "USING TEXT INDEX" not in cypher_no

@patch("neo4j.GraphDatabase.driver")
def test_anchoring_logic_binds_endpoints(mock_driver):
    """Verify that templates use multiple MATCH clauses to bind endpoints."""
    shaper = QueryShaper()
    cypher, _ = shaper.anchored_entity_to_entity_shortest_path("s1", "t1")

    # Should have two MATCHes before the shortestPath
    assert cypher.count("MATCH") == 3
    assert "MATCH (s:Entity {id: $src_id})" in cypher
    assert "MATCH (t:Entity {id: $tgt_id})" in cypher
