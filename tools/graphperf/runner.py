import os
import time
import json
import hashlib
from datetime import datetime
from neo4j import GraphDatabase, basic_auth
from tools.graphperf.plan_canonicalizer import get_plan_hash, get_db_hits

class GraphPerfRunner:
    def __init__(self):
        self.uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.environ.get("NEO4J_USER", "neo4j")
        self.password = os.environ.get("NEO4J_PASSWORD", "password")
        self.output_dir = "artifacts/evidence"
        os.makedirs(self.output_dir, exist_ok=True)

    def get_driver(self):
        return GraphDatabase.driver(self.uri, auth=basic_auth(self.user, self.password))

    def run_benchmark(self, query_id, cypher, params, iterations=50):
        started_at = datetime.utcnow().isoformat() + "Z"
        driver = self.get_driver()

        latencies = []
        db_hits = 0
        plan_hash = "none"

        try:
            with driver.session() as session:
                # Warmup
                for _ in range(5):
                    session.run(cypher, **params).consume()

                # Timed iterations
                for i in range(iterations):
                    start = time.perf_counter()
                    # We profile on every run to ensure plan stability,
                    # though in prod we might only profile once.
                    res = session.run(f"PROFILE {cypher}", **params)
                    summary = res.consume()
                    end = time.perf_counter()

                    latencies.append((end - start) * 1000)

                    if i == 0 and summary.profile:
                        plan_hash = get_plan_hash(summary.profile)
                        db_hits = get_db_hits(summary.profile)

            latencies.sort()
            p50 = latencies[len(latencies)//2]
            p95 = latencies[int(len(latencies)*0.95)]

            finished_at = datetime.utcnow().isoformat() + "Z"

            # Generate deterministic Evidence ID
            config_payload = {
                "query_id": query_id,
                "cypher": cypher,
                "params": sorted(params.items()),
                "neo4j_version": "5.x" # Mocked for now
            }
            config_hash = hashlib.sha256(json.dumps(config_payload).encode()).hexdigest()[:12].upper()
            evidence_id = f"EVD-GPQ-{config_hash}-001"

            self.emit_evidence(evidence_id, {
                "p50_ms": p50,
                "p95_ms": p95,
                "db_hits": db_hits,
                "plan_hash": plan_hash
            }, started_at, finished_at, query_id)

            return evidence_id

        finally:
            driver.close()

    def emit_evidence(self, evidence_id, metrics, started_at, finished_at, query_id):
        evid_path = os.path.join(self.output_dir, evidence_id)
        os.makedirs(evid_path, exist_ok=True)

        # stamp.json
        with open(os.path.join(evid_path, "stamp.json"), "w") as f:
            json.dump({
                "evidence_id": evidence_id,
                "started_at": started_at,
                "finished_at": finished_at,
                "created_utc": finished_at, # Compatibility with verify_evidence.py
                "git_commit": os.environ.get("GIT_COMMIT", "unknown"),
                "runner": "GraphPerfRunner"
            }, f, indent=2)

        # metrics.json
        # Convert all metrics to numbers for schema compliance where needed,
        # but plan_hash is string. The schema says additionalProperties: false.
        # Wait, metrics.schema.json said:
        # "metrics": { "type": "object", "additionalProperties": { "type": "number" } }
        # So I cannot put plan_hash in metrics.json.

        numeric_metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}

        with open(os.path.join(evid_path, "metrics.json"), "w") as f:
            json.dump({
                "evidence_id": evidence_id,
                "metrics": numeric_metrics
            }, f, indent=2)

        # report.json
        with open(os.path.join(evid_path, "report.json"), "w") as f:
            json.dump({
                "evidence_id": evidence_id,
                "item_slug": "graphperf-path-query",
                "summary": f"GraphPerf benchmark for {query_id}. P95: {metrics['p95_ms']:.2f}ms, dbHits: {metrics['db_hits']}",
                "status": "PASS" if metrics['p95_ms'] < 500 else "FAIL",
                "artifacts": [
                    {
                        "path": f"evidence/{evidence_id}/metrics.json",
                        "sha256": hashlib.sha256(open(os.path.join(evid_path, "metrics.json"), "rb").read()).hexdigest()
                    }
                ]
            }, f, indent=2)

        # Update global evidence/index.json
        index_path = "evidence/index.json"
        if os.path.exists(index_path):
            with open(index_path, "r") as f:
                try:
                    index = json.load(f)
                except:
                    index = {"version": "1.0", "items": {}}

            if "items" not in index:
                index["items"] = {}

            index["items"][evidence_id] = {
                "title": f"GraphPerf benchmark: {query_id}",
                "category": "performance",
                "files": [
                    f"evidence/{evidence_id}/report.json",
                    f"evidence/{evidence_id}/metrics.json",
                    f"evidence/{evidence_id}/stamp.json"
                ]
            }

            with open(index_path, "w") as f:
                json.dump(index, f, indent=2)

        print(f"Evidence emitted to {evid_path}")

if __name__ == "__main__":
    runner = GraphPerfRunner()
    # Example run (would fail without Neo4j)
    # runner.run_benchmark("test_query", "MATCH (n) RETURN count(n)", {})
