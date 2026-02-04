from summit.integrations.palantir_gotham import TemporalGraphEngine, TemporalNode

def test_temporal_geospatial_search():
    engine = TemporalGraphEngine()

    # A person at (0,0) valid in 2024
    n1 = TemporalNode("p1", "2024-01-01", "2024-12-31", 0.0, 0.0)
    engine.add_node(n1)

    # A person far away
    n2 = TemporalNode("p2", "2024-01-01", "2024-12-31", 10.0, 10.0)
    engine.add_node(n2)

    # A person at (0,0) but expired in 2023
    n3 = TemporalNode("p3", "2023-01-01", "2023-12-31", 0.0, 0.0)
    engine.add_node(n3)

    # Search: At (0,0), radius 10km, time 2024-06-01
    results = engine.find_nearby(0.0, 0.0, 10.0, "2024-06-01")

    assert "p1" in results
    assert "p2" not in results # Too far
    assert "p3" not in results # Expired
