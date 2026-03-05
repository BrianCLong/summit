import json
import os
import time

from pipelines.docgraph.graph_builder import build_graph


def run_bench():
    os.environ["SUMMIT_ENABLE_DOCGRAPH"] = "ON"
    text = "Word " * 10000

    t0 = time.time()
    graph = build_graph(text)
    t1 = time.time()

    latency = t1 - t0

    results = {
        "10k_words_latency": latency
    }
    with open("bench_results.json", "w") as f:
        json.dump(results, f)

    print(f"Benchmark finished. 10k words latency: {latency:.4f}s")

if __name__ == "__main__":
    run_bench()
