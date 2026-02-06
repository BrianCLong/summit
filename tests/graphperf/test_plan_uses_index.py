import pytest
from graphperf.querylib.anchor import QueryShaper

def test_anchored_evidence_shortest_path_uses_hint():
    shaper = QueryShaper(use_hints=True, available_indexes=["Evidence(body)"])
    cypher, params = shaper.anchored_evidence_shortest_path("test", "tgt")
    assert "USING TEXT INDEX s:Evidence(body)" in cypher

def test_anchored_evidence_shortest_path_no_hint_if_not_available():
    shaper = QueryShaper(use_hints=True, available_indexes=["Other(prop)"])
    cypher, params = shaper.anchored_evidence_shortest_path("test", "tgt")
    assert "USING TEXT INDEX" not in cypher
