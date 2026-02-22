import sys
import os
import time
import json
import tracemalloc

# Add root to sys.path
sys.path.append(os.getcwd())

from summit.pipelines.ip_capture.pipeline import run_ip_capture

def benchmark(input_path, output_dir, iterations=5):
    if not os.path.exists(input_path):
        print(f"Error: Input {input_path} not found")
        return

    latencies = []

    tracemalloc.start()

    for i in range(iterations):
        start = time.time()
        run_ip_capture(input_path, output_dir, slug=f"bench-{i}")
        latencies.append(time.time() - start)

    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    avg_latency = sum(latencies) / len(latencies)
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]

    bench_data = {
        "iterations": iterations,
        "avg_latency_s": avg_latency,
        "p95_latency_s": p95_latency,
        "peak_memory_mb": peak / (1024 * 1024)
    }

    out_file = os.path.join(output_dir, "bench.json")
    with open(out_file, "w") as f:
        json.dump(bench_data, f, indent=2)

    print(f"Benchmark complete. Results written to {out_file}")
    print(json.dumps(bench_data, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/bench/ip_capture_bench.py <input_file> <output_dir>")
        sys.exit(1)

    benchmark(sys.argv[1], sys.argv[2])
