from graph_shape_guardrail.sampling import bottom_k_sample


def test_bottom_k_sample_determinism():
    node_degree_map = {f"node_{i}": i for i in range(100)}
    sample1 = bottom_k_sample(node_degree_map, 10, seed="v1")
    sample2 = bottom_k_sample(node_degree_map, 10, seed="v1")
    assert sample1 == sample2

def test_bottom_k_sample_different_seed():
    node_degree_map = {f"node_{i}": i for i in range(100)}
    sample1 = bottom_k_sample(node_degree_map, 10, seed="v1")
    sample2 = bottom_k_sample(node_degree_map, 10, seed="v2")
    # Extremely unlikely to be exactly the same for 100 nodes and k=10
    assert sample1 != sample2

def test_bottom_k_sample_size():
    node_degree_map = {f"node_{i}": i for i in range(100)}
    sample = bottom_k_sample(node_degree_map, 10, seed="v1")
    assert len(sample) == 10

def test_bottom_k_sample_small_input():
    node_degree_map = {"a": 1, "b": 2}
    sample = bottom_k_sample(node_degree_map, 10, seed="v1")
    assert len(sample) == 2
    assert sorted(sample) == [1, 2]
