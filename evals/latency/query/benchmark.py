import json
import time
import random
import os
import argparse
from typing import Dict, Any

class MockQueryEngine:
    """Mock query engine to test query latency percentiles without external calls."""
    def __init__(self, node_count: int):
        self.node_count = node_count

    def execute_query(self, complexity: int) -> float:
        """Simulate query execution. Returns time taken."""
        start = time.perf_counter()

        # Base latency based on complexity + scale penalty
        base_latency = 0.05 * complexity
        scale_penalty = (self.node_count / 1000) * 0.02

        # Add realistic jitter (p99 tail latency)
        is_p99_tail = random.random() > 0.99
        is_p95_tail = random.random() > 0.95

        jitter = random.uniform(0, 0.01)
        if is_p99_tail:
            jitter += random.uniform(0.1, 0.2) # Tail latency spike
        elif is_p95_tail:
            jitter += random.uniform(0.05, 0.1)

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

def run_latency_benchmark(scale: int, num_queries: int = 200) -> Dict[str, Any]:
    print(f"Running latency benchmark at scale {scale}...")

    engine = MockQueryEngine(node_count=scale)
    latencies = []

    # Pre-warm
    for _ in range(10):
        engine.execute_query(complexity=1)

    for _ in range(num_queries):
        # Queries of varying complexity
        complexity = random.choice([1, 1, 1, 2, 2, 3])
        lat = engine.execute_query(complexity)
        latencies.append(lat)

    stats = calculate_percentiles(latencies)

    return {
        "scale": scale,
        "query_latency_sec": {k: round(v, 4) for k, v in stats.items()},
        "total_queries": num_queries
    }

def main():
    parser = argparse.ArgumentParser(description="Query Latency Benchmark Suite")
    parser.add_argument("--output", default="evals/latency/results.json", help="Path to output JSON")
    args = parser.parse_args()

    scales = [10, 100, 1000]
    results = {}

    for scale in scales:
        scale_key = f"scale_{scale}"
        results[scale_key] = run_latency_benchmark(scale=scale, num_queries=100)

    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    final_output = {
        "timestamp": timestamp,
        "environment": "synthetic",
        "results": results
    }

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    with open(args.output, "w") as f:
        json.dump(final_output, f, indent=2)

    print(f"\nResults saved to {args.output}")

if __name__ == "__main__":
    main()
