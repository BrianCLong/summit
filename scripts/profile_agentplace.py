import time
import tracemalloc
import json
import os
import sys

# Add root to sys.path
sys.path.append(os.getcwd())

from modules.agentplace.evaluator import AgentEvaluator

def main():
    manifest = {
        "name": "BenchmarkAgent",
        "version": "1.0.0",
        "owner": "bench@example.com",
        "description": "Benchmarking",
        "capabilities": ["network_access", "file_system", "system_calls"],
        "permissions": ["read", "write", "execute"],
        "data_access": ["internal", "confidential"]
    }

    # Initialize evaluator (load schemas once)
    evaluator = AgentEvaluator()

    # Warmup
    for _ in range(10):
        evaluator.evaluate(manifest)

    iterations = 1000

    # Measure Latency
    start_time = time.perf_counter()
    for _ in range(iterations):
        evaluator.evaluate(manifest)
    end_time = time.perf_counter()

    total_time = end_time - start_time
    avg_latency_ms = (total_time / iterations) * 1000

    # Measure Memory
    tracemalloc.start()
    evaluator.evaluate(manifest)
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    peak_mb = peak / 1024 / 1024

    metrics = {
        "latency_ms": avg_latency_ms,
        "peak_memory_mb": peak_mb,
        "iterations": iterations
    }

    print(json.dumps(metrics, indent=2))

    with open("metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Budget Check
    if avg_latency_ms > 50:
        print(f"PERFORMANCE FAILURE: Latency {avg_latency_ms:.2f}ms > 50ms")
        sys.exit(1)

    if peak_mb > 20:
        print(f"PERFORMANCE FAILURE: Memory {peak_mb:.2f}MB > 20MB")
        sys.exit(1)

    print("Performance Check Passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
