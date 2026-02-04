import json
import os
import time

from summit_emu3.backends.dummy import DummyBackend


def benchmark_dummy():
    print("Benchmarking Dummy Backend...")
    backend = DummyBackend()

    start_time = time.time()
    for _ in range(100):
        backend.generate_evidence("dummy_input", "caption")
    end_time = time.time()

    avg_latency = (end_time - start_time) / 100
    print(f"Average Latency (Dummy): {avg_latency*1000:.2f} ms")

    return {"backend": "dummy", "avg_latency_ms": avg_latency * 1000}

def main():
    results = []
    results.append(benchmark_dummy())

    os.makedirs("artifacts/emu3", exist_ok=True)
    with open("artifacts/emu3/bench.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
