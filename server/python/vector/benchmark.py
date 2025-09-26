"""Simple latency benchmark harness for Milvus similarity search."""

from __future__ import annotations

import argparse
import random
import statistics
import time
from typing import List

from .milvus_store import MilvusVectorStore, VectorRecord


def seed_vectors(store: MilvusVectorStore, tenant_id: str, dimension: int, count: int) -> None:
    rng = random.Random(42)
    records = []
    for idx in range(count):
        embedding = [rng.random() for _ in range(dimension)]
        records.append(
            VectorRecord(
                tenant_id=tenant_id,
                node_id=f"benchmark-node-{idx}",
                embedding=embedding,
                metadata={"seed": idx},
            )
        )
    store.upsert(records)


def run_benchmark(store: MilvusVectorStore, tenant_id: str, query_vector: List[float], iterations: int) -> None:
    latencies: List[float] = []
    for _ in range(iterations):
        start = time.perf_counter()
        store.search(tenant_id=tenant_id, query_vector=query_vector, top_k=5, min_score=0.0)
        latencies.append((time.perf_counter() - start) * 1000)

    avg = statistics.mean(latencies)
    p95 = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 100 else max(latencies)
    print(f"Ran {iterations} searches. Avg latency: {avg:.2f} ms, p95: {p95:.2f} ms, max: {max(latencies):.2f} ms")


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark Milvus similarity search latency")
    parser.add_argument("--tenant", default="benchmark-tenant")
    parser.add_argument("--seed", action="store_true", help="Seed synthetic vectors before benchmarking")
    parser.add_argument("--count", type=int, default=1000, help="Number of vectors to seed when --seed is provided")
    parser.add_argument("--iterations", type=int, default=20)
    args = parser.parse_args()

    store = MilvusVectorStore()
    dimension = store.dimension

    if args.seed:
        seed_vectors(store, args.tenant, dimension, args.count)

    query_vector = [random.random() for _ in range(dimension)]
    run_benchmark(store, args.tenant, query_vector, args.iterations)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
