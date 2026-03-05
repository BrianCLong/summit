import os

from .replay_harness import replay_suite

DATASET = os.getenv("DEBEZIUM_TOPIC_JSON", "tests/fixtures/debezium_topic_sample.json")
RECONCILER_URL = os.getenv("RECONCILER_URL", "http://localhost:8080")

def test_randomized_replays():
    results, hashes = replay_suite(DATASET, RECONCILER_URL, runs=1000, seed=1337)
    # (A) Determinism
    assert len(hashes) == 1, f"Non-deterministic final graph state across replays: {hashes}"
    # (C) Safety (no-op rate for out-of-order >= 99.9%)
    # If dataset is mostly in-order, this threshold may be lower; tune per dataset.
    assert all(r["noop_rate"] >= 0.999 for r in results), "Out-of-order safety below 99.9%"
