import os
import time
import json
from neo4j import GraphDatabase, basic_auth
from graphperf.querylib.anchor import QueryShaper

def get_neo4j_client():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))

def evaluate_anchoring_effect():
    """
    Eval: compare dbHits + P95 latency for anchored vs deliberately unanchored variants.
    """
    shaper = QueryShaper(use_hints=True)
    driver = get_neo4j_client()

    # Variants to test
    variants = [
        {
            "id": "anchored_with_hints",
            "cypher": shaper.anchored_evidence_shortest_path("canary", "target_123")[0]
        },
        {
            "id": "unanchored_naive",
            "cypher": "MATCH (s:Evidence)-[:EVIDENCE_OF*..4]->(t:Entity {id: $target_id}) WHERE s.body CONTAINS $body_query RETURN count(*)"
        }
    ]

    results = []

    try:
        with driver.session() as session:
            for v in variants:
                params = {"body_query": "canary", "target_id": "target_123"}

                # Warmup
                for _ in range(5):
                    session.run(v["cypher"], **params).consume()

                # Measure iterations
                latencies = []
                total_db_hits = 0

                for _ in range(20):
                    start = time.perf_counter()
                    res = session.run(f"PROFILE {v['cypher']}", **params)
                    summary = res.consume()
                    end = time.perf_counter()
                    latencies.append((end - start) * 1000)

                    if summary.profile:
                        def count_hits(p):
                            h = p.db_hits
                            for c in p.children:
                                h += count_hits(c)
                            return h
                        total_db_hits = count_hits(summary.profile)

                latencies.sort()
                p95 = latencies[int(len(latencies) * 0.95)]

                results.append({
                    "variant_id": v["id"],
                    "p95_ms": p95,
                    "avg_db_hits": total_db_hits # Hits are deterministic per plan/data
                })

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    evaluate_anchoring_effect()
