import json

from stamp import generate_stamp


def test_stamp_determinism():
    inputs = {"mode": "offline", "fixture": "test.json"}
    outputs = {"total_runs": 10, "success_rate": 0.9}

    stamp1 = generate_stamp(inputs, outputs)
    stamp2 = generate_stamp(inputs, outputs)

    assert stamp1["input_hash"] == stamp2["input_hash"]
    assert stamp1["output_hash"] == stamp2["output_hash"]
    # Timestamps will differ, but hashes should be identical
