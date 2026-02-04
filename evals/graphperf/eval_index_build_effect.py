import os
import time
import json
from neo4j import GraphDatabase, basic_auth

def get_neo4j_client():
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "password")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))

QUERIES = {
    "evidence_text_search": "MATCH (n:Evidence) WHERE n.body CONTAINS $text RETURN count(n)",
    "event_timestamp_range": "MATCH (n:Event) WHERE n.timestamp > $start AND n.timestamp < $end RETURN count(n)",
}

def evaluate_index_effect():
    """
    Eval: on canary dataset, run representative queries and capture
    (a) plan operators, (b) dbHits, (c) elapsed time.
    """
    driver = get_neo4j_client()
    eval_results = []

    try:
        with driver.session() as session:
            for query_id, cypher in QUERIES.items():
                params = {
                    "text": "canary",
                    "start": 1600000000,
                    "end": 1700000000
                }

                # Capture PROFILE data
                profile_query = f"PROFILE {cypher}"

                start_ts = time.perf_counter()
                result = session.run(profile_query, **params)
                summary = result.consume()
                end_ts = time.perf_counter()

                latency_ms = (end_ts - start_ts) * 1000

                profile_data = summary.profile
                db_hits = 0
                operators = []

                def walk_profile(p):
                    nonlocal db_hits
                    db_hits += p.db_hits
                    operators.append(p.operator_type)
                    for child in p.children:
                        walk_profile(child)

                if profile_data:
                    walk_profile(profile_data)

                eval_results.append({
                    "query_id": query_id,
                    "latency_ms": latency_ms,
                    "db_hits": db_hits,
                    "operators": operators,
                    "has_index_scan": any("Index" in op for op in operators)
                })

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return

    print(json.dumps(eval_results, indent=2))

if __name__ == "__main__":
    evaluate_index_effect()
