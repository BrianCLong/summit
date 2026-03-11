import json
import time
import random
import os
import argparse
import tracemalloc
from typing import Dict, Any

class MockGraphRAG:
    """Mock implementation of GraphRAG for testing purposes."""
    def __init__(self, node_count: int):
        self.node_count = node_count
        # Pre-allocate some memory to simulate graph structure
        self.nodes = [f"node_{i}" for i in range(node_count)]
        self.edges = [(random.choice(self.nodes), random.choice(self.nodes)) for _ in range(node_count * 2)]

    def ingest(self, docs_count: int) -> float:
        """Simulate document ingestion. Returns time taken."""
        start = time.perf_counter()
        # Simulate work relative to docs count
        time.sleep(docs_count * 0.001)
        # Simulate graph growth
        new_nodes = docs_count * 2
        self.node_count += new_nodes
        self.nodes.extend([f"node_{i}" for i in range(self.node_count - new_nodes, self.node_count)])
        return time.perf_counter() - start

    def query(self, complexity: int) -> float:
        """Simulate graph traversal query. Returns time taken."""
        start = time.perf_counter()
        # Complexity (1-3) * base latency + scale penalty
        scale_penalty = (self.node_count / 1000) * 0.01
        base_latency = 0.02 * complexity
        jitter = random.uniform(0, 0.01)
        time.sleep(base_latency + scale_penalty + jitter)
        return time.perf_counter() - start

def calculate_percentiles(latencies: list[float]) -> Dict[str, float]:
    sorted_lats = sorted(latencies)
    n = len(sorted_lats)
    if n == 0:
        return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0}

    def get_percentile(p):
        idx = int(n * p)
        return sorted_lats[idx] if idx < n else sorted_lats[-1]

    return {
        "p50": get_percentile(0.50),
        "p95": get_percentile(0.95),
        "p99": get_percentile(0.99),
        "mean": sum(sorted_lats) / n
    }

def run_benchmark(scale: int, num_queries: int = 100, docs_to_ingest: int = 50) -> Dict[str, Any]:
    print(f"Running benchmark at scale {scale}...")
    tracemalloc.start()

    # 1. Setup & Ingestion
    rag = MockGraphRAG(node_count=scale)
    ingestion_time = rag.ingest(docs_to_ingest)
    ingestion_throughput = docs_to_ingest / ingestion_time if ingestion_time > 0 else 0

    # 2. Query Latency & Throughput
    query_latencies = []
    total_query_time = 0.0
    for _ in range(num_queries):
        # Mix of simple (1) and complex (3) queries
        complexity = random.choice([1, 1, 2, 3])
        lat = rag.query(complexity)
        query_latencies.append(lat)
        total_query_time += lat

    query_throughput = num_queries / total_query_time if total_query_time > 0 else 0
    latency_stats = calculate_percentiles(query_latencies)

    # 3. Memory Tracking
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # Convert bytes to MB
    peak_mem_mb = peak_mem / (1024 * 1024)

    return {
        "scale": scale,
        "nodes": rag.node_count,
        "memory_peak_mb": round(peak_mem_mb, 4),
        "ingestion": {
            "docs_processed": docs_to_ingest,
            "duration_sec": round(ingestion_time, 4),
            "throughput_docs_per_sec": round(ingestion_throughput, 2)
        },
        "query": {
            "total_queries": num_queries,
            "duration_sec": round(total_query_time, 4),
            "throughput_queries_per_sec": round(query_throughput, 2),
            "latency_sec": {k: round(v, 4) for k, v in latency_stats.items()}
        }
    }

def main():
    parser = argparse.ArgumentParser(description="GraphRAG Performance Benchmark Suite")
    parser.add_argument("--output", default="evals/performance/results.json", help="Path to output JSON")
    args = parser.parse_args()

    scales = [10, 100, 1000]
    results = {}

    # Run tests for each scale
    for scale in scales:
        scale_key = f"scale_{scale}"
        results[scale_key] = run_benchmark(scale=scale, num_queries=50)

    # Prepare final payload
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    final_output = {
        "timestamp": timestamp,
        "environment": "synthetic",
        "results": results
    }

    # Ensure directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    with open(args.output, "w") as f:
        json.dump(final_output, f, indent=2)

    print(f"\nResults saved to {args.output}")

if __name__ == "__main__":
    main()
