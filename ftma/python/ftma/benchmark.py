"""Latency and scalability benchmarks for the FTMA coordinator."""

from __future__ import annotations

import argparse
import random
import statistics
import time
from typing import Dict, Iterable, List

from . import Coordinator


def _generate_updates(num_clients: int, dimension: int) -> List[List[float]]:
    rng = random.Random(9876)
    return [[rng.uniform(-5.0, 5.0) for _ in range(dimension)] for _ in range(num_clients)]


def run_benchmark(num_clients: int, threshold: int, dimension: int, runs: int = 25) -> Dict[str, float]:
    updates = _generate_updates(num_clients, dimension)
    coordinator = Coordinator(num_clients, threshold, dimension)
    for idx, metrics in enumerate(updates):
        coordinator.register_client(idx, metrics)

    active = list(range(num_clients))
    latencies: List[float] = []
    for _ in range(runs):
        start = time.perf_counter()
        coordinator.finalize(active)
        latencies.append(time.perf_counter() - start)

    mean_latency = statistics.mean(latencies)
    stddev = statistics.pstdev(latencies)
    ci95 = 1.96 * stddev / (len(latencies) ** 0.5)

    return {
        "num_clients": float(num_clients),
        "threshold": float(threshold),
        "dimension": float(dimension),
        "mean_latency_s": mean_latency,
        "std_latency_s": stddev,
        "ci95_s": ci95,
    }


def main(argv: Iterable[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="FTMA latency benchmark")
    parser.add_argument("--clients", type=int, nargs="*", default=[32, 64, 128])
    parser.add_argument("--dimension", type=int, default=4)
    parser.add_argument("--runs", type=int, default=25)
    args = parser.parse_args(list(argv) if argv is not None else None)

    rows = []
    for clients in args.clients:
        threshold = max(3, int(0.7 * clients))
        row = run_benchmark(clients, threshold, args.dimension, runs=args.runs)
        rows.append(row)

    header = "clients\tthreshold\tdimension\tmean_latency_s\tci95_s"
    print(header)
    for row in rows:
        print(
            f"{int(row['num_clients'])}\t{int(row['threshold'])}\t{int(row['dimension'])}\t"
            f"{row['mean_latency_s']:.6f}\t{row['ci95_s']:.6f}"
        )


if __name__ == "__main__":
    main()
