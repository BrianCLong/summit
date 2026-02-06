import os, time, json, hashlib
from datetime import datetime
from neo4j import GraphDatabase, basic_auth
from tools.graphperf.plan_canonicalizer import get_plan_hash, get_db_hits

class GraphPerfRunner:
    def __init__(self):
        self.uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.environ.get("NEO4J_USER", "neo4j")
        self.password = os.environ.get("NEO4J_PASSWORD", "password")
        self.output_dir = "evidence"
        os.makedirs(self.output_dir, exist_ok=True)

    def get_driver(self):
        return GraphDatabase.driver(self.uri, auth=basic_auth(self.user, self.password))

    def run_benchmark(self, query_id, cypher, params, iterations=10):
        started_at = datetime.utcnow().isoformat() + "Z"
        driver = self.get_driver()
        latencies = []
        db_hits = 0
        plan_hash = "none"
        try:
            with driver.session() as session:
                for _ in range(2): session.run(cypher, **params).consume()
                for i in range(iterations):
                    start = time.perf_counter()
                    res = session.run(f"PROFILE {cypher}", **params)
                    summary = res.consume()
                    latencies.append((time.perf_counter() - start) * 1000)
                    if i == 0 and summary.profile:
                        plan_hash = get_plan_hash(summary.profile)
                        db_hits = get_db_hits(summary.profile)
            latencies.sort()
            p50, p95 = latencies[len(latencies)//2], latencies[int(len(latencies)*0.95)]
            finished_at = datetime.utcnow().isoformat() + "Z"
            config_payload = {"query_id": query_id, "cypher": cypher, "params": sorted(params.items())}
            config_hash = hashlib.sha256(json.dumps(config_payload, sort_keys=True).encode()).hexdigest()[:12].upper()
            evidence_id = f"EVD-GPQ-{config_hash}-001"
            self.emit_evidence(evidence_id, {"p50_ms": p50, "p95_ms": p95, "db_hits": db_hits, "plan_hash": plan_hash}, started_at, finished_at, query_id)
            return evidence_id
        finally: driver.close()

    def emit_evidence(self, evidence_id, metrics, started_at, finished_at, query_id):
        path = os.path.join(self.output_dir, evidence_id)
        os.makedirs(path, exist_ok=True)
        with open(os.path.join(path, "stamp.json"), "w") as f:
            json.dump({"evidence_id": evidence_id, "started_at": started_at, "finished_at": finished_at, "created_utc": finished_at, "git_commit": os.environ.get("GIT_COMMIT", "unknown"), "runner": "GraphPerfRunner"}, f, indent=2)
        numeric_metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}
        with open(os.path.join(path, "metrics.json"), "w") as f:
            json.dump({"evidence_id": evidence_id, "metrics": numeric_metrics}, f, indent=2)
        with open(os.path.join(path, "report.json"), "w") as f:
            json.dump({"evidence_id": evidence_id, "item_slug": "graphperf-path-query", "summary": f"Benchmark {query_id}", "artifacts": [{"path": f"evidence/{evidence_id}/metrics.json", "sha256": "..."}]}, f, indent=2)
        index_path = "evidence/index.json"
        if os.path.exists(index_path):
            with open(index_path, "r") as f: index = json.load(f)
            if "items" not in index: index["items"] = []
            index["items"] = [e for e in index["items"] if e.get("evidence_id") != evidence_id]
            index["items"].append({"evidence_id": evidence_id, "report": f"evidence/{evidence_id}/report.json", "metrics": f"evidence/{evidence_id}/metrics.json", "stamp": f"evidence/{evidence_id}/stamp.json"})
            with open(index_path, "w") as f: json.dump(index, f, indent=2)

if __name__ == "__main__":
    if os.environ.get("RUN_GRAPHPERF_BENCHMARK") == "1":
        runner = GraphPerfRunner()
        runner.run_benchmark("anchored_shortest_path", "MATCH (s:Evidence {id: $src_id}), (t:Evidence {id: $tgt_id}) MATCH p = shortestPath((s)-[*1..4]-(t)) RETURN p", {"src_id": "1", "tgt_id": "2"})
