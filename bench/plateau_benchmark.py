import time
import json
import random
import os

def run_benchmark():
    sizes = [1000, 10000, 100000] # Tokens
    results = []

    modes = ["single_region", "multi_region", "edge_cache"]

    for mode in modes:
        for s in sizes:
            # Simulate indexing
            start = time.time()
            # Sleep proportional to size to mock work
            time.sleep(s / 1000000.0)
            index_time = time.time() - start

            # Simulate retrieval
            latencies = []
            for _ in range(10):
                r_start = time.time()
                base_latency = random.uniform(0.001, 0.005)
                if mode == "edge_cache":
                    base_latency *= 0.1 # 10x faster
                elif mode == "multi_region":
                    base_latency *= 1.2 # Overhead

                time.sleep(base_latency)
                latencies.append(time.time() - r_start)

            latencies.sort()
            p50 = latencies[len(latencies)//2] * 1000
            p95 = latencies[int(len(latencies)*0.95)] * 1000

            results.append({
                "mode": mode,
                "tokens_total": s,
                "chunks_total": s // 100,
                "nodes_total": s // 500,
                "edges_total": s // 500 * 2,
                "index_s": index_time,
                "retrieve_p50_ms": p50,
                "retrieve_p95_ms": p95
            })

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    run_benchmark()
