from summit.integrations.palantir_gotham_holographic import HolographicGraph, CounterfactualSimulator

def test_vector_search():
    hg = HolographicGraph()
    hg.add_node("king", [1.0, 0.5])
    hg.add_node("queen", [1.0, 0.45]) # Very close
    hg.add_node("apple", [0.0, 0.1])  # Far

    similar = hg.find_similar_by_vector([1.0, 0.5], top_k=2)
    assert "king" in similar
    assert "queen" in similar
    assert "apple" not in similar

def test_counterfactual_sim():
    hg = HolographicGraph()
    hg.add_node("hub", [0,0])
    hg.add_node("spoke1", [0,0])
    hg.add_edge("hub", "spoke1", "connects")

    sim = CounterfactualSimulator(hg)
    impact = sim.simulate_intervention("delete_node", "hub")

    # Should say removed 1 node and 1 edge
    assert "Removed 1 nodes" in impact
    assert "Severed 1 edges" in impact
