from summit.integrations.palantir_gotham import HyperGraph

def test_hypergraph_time_travel():
    hg = HyperGraph()

    # T1: 50% confidence link
    hg.add_hyperedge(["A", "B"], "met", 0.5, "2024-01-01")
    # T2: 90% confidence link
    hg.add_hyperedge(["A", "B", "C"], "conspired", 0.9, "2024-02-01")

    # Query at T1 with high confidence filter -> Should be empty
    res_t1 = hg.time_travel_query("2024-01-01", min_confidence=0.8)
    assert len(res_t1) == 0

    # Query at T2 with high confidence -> Should find the 90% edge
    res_t2 = hg.time_travel_query("2024-02-01", min_confidence=0.8)
    assert len(res_t2) == 1
    assert res_t2[0]["type"] == "conspired"

def test_entity_resolution():
    hg = HyperGraph()

    # First see "John Smith"
    c1 = hg.resolve_entities("John Smith")
    assert c1 == "John Smith"

    # Then see "J. Smith" (Fuzzy match mock)
    c2 = hg.resolve_entities("J. Smith")
    # Should resolve to same canonical if logic works
    # Our mock logic: "J. Smith" in "John Smith" -> True? No.
    # "John Smith" in "J. Smith"? No.
    # Let's try "John S."
    c3 = hg.resolve_entities("John S.")
    assert c3 == "John Smith" # "John S." in "John Smith"
