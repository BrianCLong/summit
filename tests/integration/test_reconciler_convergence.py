import json
import os
from pathlib import Path

from reconciler.neo4j_reconciler import compute_final_hash, replay_jsonl

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PWD = os.getenv("NEO4J_PASSWORD", "password")

JSONL_PATH = os.getenv("RECONCILE_CANARY_JSONL", "tests/data/canary_10k.jsonl")
CYPHER_PATH = "reconciler/cypher_templates/merge_upsert.cypher"

EXPECTED = json.loads(Path("tests/data/canary_expectations.json").read_text())
EXPECTED_HASH = EXPECTED["final_graph_hash"]

MAX_CONVERGENCE_SECONDS = 30.0
MIN_NOOP_RATE = 0.999


def test_reconciler_converges_fast_and_idempotent():
    m = replay_jsonl(NEO4J_URI, NEO4J_USER, NEO4J_PWD, JSONL_PATH, CYPHER_PATH)
    final_hash = compute_final_hash(NEO4J_URI, NEO4J_USER, NEO4J_PWD)

    assert final_hash == EXPECTED_HASH, "final_graph_hash != expected_hash"
    assert m["reconcile.convergence_seconds"] <= MAX_CONVERGENCE_SECONDS, "convergence_seconds > 30s"
    assert m["reconcile.noop_rate"] >= MIN_NOOP_RATE, "noop_rate < 0.999"

    # Export metrics for scraping / CI artifact.
    Path("observability/reconcile_metrics.prom").write_text(
        "\n".join(f"{k} {m[k]}" for k in sorted(m.keys()))
    )
