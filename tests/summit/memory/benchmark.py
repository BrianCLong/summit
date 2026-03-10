import time
from datetime import datetime
import json
import sys

from summit.memory.ingestion import ingest_moment
from summit.memory.policy import AmbientPolicy
from summit.memory.retrieval import MemoryRetriever

# Note: this expects Qdrant and Neo4j imports to exist locally.
# The benchmark will use the local fallback (or real local services if running).

def generate_test_data(num_records: int):
    policy = AmbientPolicy()
    moments = []

    # We will insert a known fact to test accuracy
    moments.append(ingest_moment({
        "source_app": "confluence",
        "uri": "wiki/hybrid-search-design",
        "title": "Hybrid Search Arch",
        "text": "The secret hybrid vector backend GA launch relies heavily on Qdrant collections and Neo4j relations to blend semantic similarity.",
        "timestamp": datetime(2023, 1, 1, 10, 0, 0)
    }, policy))

    # Fill with noise
    for i in range(num_records - 1):
        moments.append(ingest_moment({
            "source_app": "slack",
            "uri": f"slack.com/channel/random/{i}",
            "title": f"Random chat {i}",
            "text": f"Just another message talking about random engineering topics {i}",
            "timestamp": datetime(2023, 1, 1, 12, 0, 0)
        }, policy))

    return [m for m in moments if m is not None]

def run_benchmark():
    print("Starting Semantic Search Benchmark...")
    retriever = MemoryRetriever()

    moments = generate_test_data(100)

    start_ingest = time.time()
    for m in moments:
        retriever.insert(m)
    ingest_latency = time.time() - start_ingest
    print(f"Ingested {len(moments)} moments in {ingest_latency:.3f}s")

    # Run targeted query
    query = "semantic similarity Qdrant backend"
    start_search = time.time()
    results = retriever.search(query)
    search_latency = (time.time() - start_search) * 1000  # ms

    print(f"Search latency: {search_latency:.2f} ms")

    # Check accuracy
    found_target = False
    accuracy = 0.0

    for i, res in enumerate(results):
        if "hybrid vector backend GA launch relies heavily on Qdrant" in res["moment"].text:
            found_target = True
            # Higher score if found early
            accuracy = 1.0 if i == 0 else (1.0 / (i + 1))
            break

    print(f"Retrieval Accuracy Score: {accuracy:.2f}")

    # Fail if accuracy is zero (couldn't find the target fact in top results)
    if accuracy == 0:
        print("BENCHMARK FAILED: Target fact not found in top results.")
        sys.exit(1)

    # Optional performance gating
    if search_latency > 500: # We want < 500ms
        print("BENCHMARK FAILED: Search latency > 500ms.")
        sys.exit(1)

    metrics = {
        "dataset_size": len(moments),
        "ingest_latency_sec": ingest_latency,
        "search_latency_ms": search_latency,
        "retrieval_accuracy": accuracy,
    }

    with open("benchmark_report.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("Benchmark completed successfully.")

if __name__ == "__main__":
    run_benchmark()
