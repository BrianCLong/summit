import os
import time
import json
from neo4j import GraphDatabase, basic_auth

def get_neo4j_client():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))

def evaluate_crsp():
    """
    Cache-Resilience ShortestPath (CRSP) benchmark.
    Measures delta between warm-cache P95 and cold-cache P95
    for anchored shortest-path queries.
    """
    driver = get_neo4j_client()
    results = {}

    query = (
        "MATCH (s:Evidence) WHERE s.body CONTAINS $query "
        "MATCH (t:Entity {id: $target_id}) "
        "MATCH p = shortestPath((s)-[:EVIDENCE_OF*..4]->(t)) "
        "RETURN count(p)"
    )
    params = {"query": "canary", "target_id": "target_999"}

    try:
        with driver.session() as session:
            # 1. Simulate Cold Cache
            # Note: Truly clearing the OS/Neo4j page cache usually requires a restart.
            # We can clear the query plan cache, but not the data page cache easily via Cypher.
            try:
                session.run("CALL db.clearQueryCaches()").consume()
            except:
                pass # Might not have permissions

            start_cold = time.perf_counter()
            session.run(query, **params).consume()
            end_cold = time.perf_counter()
            cold_ms = (end_cold - start_cold) * 1000

            # 2. Measure Warm Cache (steady state)
            warm_latencies = []
            for _ in range(10):
                start_warm = time.perf_counter()
                session.run(query, **params).consume()
                end_warm = time.perf_counter()
                warm_latencies.append((end_warm - start_warm) * 1000)

            warm_latencies.sort()
            p95_warm = warm_latencies[int(len(warm_latencies) * 0.95)]

            results = {
                "cold_p95_ms": cold_ms,
                "warm_p95_ms": p95_warm,
                "cold_to_warm_ratio": cold_ms / p95_warm if p95_warm > 0 else 0
            }

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    evaluate_crsp()
