import random
from graph_shape_guardrail.sampling import bottom_k_sample_stream

def test_bottom_k_sample_stream_logic():
    # If we have 1000 elements and k=10
    # The smallest hashes should be selected regardless of the order
    data = [(f"node_{i}", i) for i in range(1000)]

    # Randomize order
    random.seed(42)
    random.shuffle(data)

    sample1 = bottom_k_sample_stream(iter(data), 10, seed="v1")

    # Shuffle again
    random.shuffle(data)
    sample2 = bottom_k_sample_stream(iter(data), 10, seed="v1")

    assert sample1 == sample2
    assert len(sample1) == 10

def test_bottom_k_sample_stream_all_selected():
    data = [("a", 1), ("b", 2)]
    sample = bottom_k_sample_stream(iter(data), 10, seed="v1")
    assert len(sample) == 2
