#!/usr/bin/env python3
"""
Performance Benchmark Script for Demo Pipelines

Measures:
- Pipeline execution time
- Memory usage
- Throughput (items/second)
- Latency percentiles

Usage:
    python3 benchmark.py              # Run all benchmarks
    python3 benchmark.py --misinfo    # Run misinfo benchmark only
    python3 benchmark.py --iterations 5  # Custom iteration count
"""

import sys
import time
import json
import argparse
import statistics
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Any

# Add paths for imports
SCRIPT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SCRIPT_DIR / "misinfo-defense" / "pipelines"))
sys.path.insert(0, str(SCRIPT_DIR / "deescalation" / "pipelines"))


@dataclass
class BenchmarkResult:
    """Benchmark result container."""
    name: str
    iterations: int
    execution_times_ms: List[float]
    items_processed: int

    @property
    def avg_time_ms(self) -> float:
        return statistics.mean(self.execution_times_ms)

    @property
    def min_time_ms(self) -> float:
        return min(self.execution_times_ms)

    @property
    def max_time_ms(self) -> float:
        return max(self.execution_times_ms)

    @property
    def std_dev_ms(self) -> float:
        return statistics.stdev(self.execution_times_ms) if len(self.execution_times_ms) > 1 else 0

    @property
    def p95_ms(self) -> float:
        sorted_times = sorted(self.execution_times_ms)
        idx = int(len(sorted_times) * 0.95)
        return sorted_times[min(idx, len(sorted_times) - 1)]

    @property
    def throughput(self) -> float:
        """Items per second."""
        avg_seconds = self.avg_time_ms / 1000
        return self.items_processed / avg_seconds if avg_seconds > 0 else 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "iterations": self.iterations,
            "items_processed": self.items_processed,
            "avg_time_ms": round(self.avg_time_ms, 2),
            "min_time_ms": round(self.min_time_ms, 2),
            "max_time_ms": round(self.max_time_ms, 2),
            "std_dev_ms": round(self.std_dev_ms, 2),
            "p95_ms": round(self.p95_ms, 2),
            "throughput_per_sec": round(self.throughput, 2)
        }


def benchmark_misinfo_pipeline(iterations: int = 3) -> BenchmarkResult:
    """Benchmark misinfo defense pipeline."""
    # Import from specific path
    misinfo_path = str(SCRIPT_DIR / "misinfo-defense" / "pipelines")
    if misinfo_path not in sys.path:
        sys.path.insert(0, misinfo_path)

    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "misinfo_loader",
        SCRIPT_DIR / "misinfo-defense" / "pipelines" / "load_demo_data.py"
    )
    misinfo_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(misinfo_module)

    DemoDataLoader = misinfo_module.DemoDataLoader
    AnalysisMode = misinfo_module.AnalysisMode

    data_path = SCRIPT_DIR / "misinfo-defense" / "datasets"
    output_path = SCRIPT_DIR / "misinfo-defense" / "output"

    execution_times = []
    items = 0

    for i in range(iterations):
        loader = DemoDataLoader(data_path, output_path, mode=AnalysisMode.MOCK)

        start = time.perf_counter()
        result = loader.process_all()
        end = time.perf_counter()

        execution_times.append((end - start) * 1000)
        items = result['total_posts']

    return BenchmarkResult(
        name="Misinfo Defense Pipeline",
        iterations=iterations,
        execution_times_ms=execution_times,
        items_processed=items
    )


def benchmark_deescalation_pipeline(iterations: int = 3) -> BenchmarkResult:
    """Benchmark de-escalation pipeline."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "deesc_loader",
        SCRIPT_DIR / "deescalation" / "pipelines" / "load_demo_data.py"
    )
    deesc_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(deesc_module)

    data_path = SCRIPT_DIR / "deescalation" / "datasets"
    output_path = SCRIPT_DIR / "deescalation" / "output"

    execution_times = []
    items = 0

    for i in range(iterations):
        loader = deesc_module.DemoConversationLoader(
            data_path, output_path,
            mode=deesc_module.AnalysisMode.MOCK
        )

        start = time.perf_counter()
        result = loader.process_all()
        end = time.perf_counter()

        execution_times.append((end - start) * 1000)
        items = result['total_conversations']

    return BenchmarkResult(
        name="De-escalation Pipeline",
        iterations=iterations,
        execution_times_ms=execution_times,
        items_processed=items
    )


def print_results(results: List[BenchmarkResult]):
    """Print benchmark results."""
    print("\n" + "=" * 70)
    print("                    PERFORMANCE BENCHMARK RESULTS")
    print("=" * 70 + "\n")

    for result in results:
        print(f"📊 {result.name}")
        print("-" * 50)
        print(f"  Iterations:        {result.iterations}")
        print(f"  Items processed:   {result.items_processed}")
        print(f"  Avg time:          {result.avg_time_ms:.2f} ms")
        print(f"  Min time:          {result.min_time_ms:.2f} ms")
        print(f"  Max time:          {result.max_time_ms:.2f} ms")
        print(f"  Std deviation:     {result.std_dev_ms:.2f} ms")
        print(f"  P95 latency:       {result.p95_ms:.2f} ms")
        print(f"  Throughput:        {result.throughput:.1f} items/sec")
        print()

    # Summary
    print("=" * 70)
    print("                          SUMMARY")
    print("=" * 70)
    total_throughput = sum(r.throughput for r in results)
    print(f"  Combined throughput: {total_throughput:.1f} items/sec")
    print(f"  All benchmarks:      {'PASSED' if all(r.avg_time_ms < 5000 for r in results) else 'SLOW'}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Benchmark demo pipelines")
    parser.add_argument("--misinfo", action="store_true", help="Run misinfo benchmark only")
    parser.add_argument("--deescalation", action="store_true", help="Run de-escalation benchmark only")
    parser.add_argument("--iterations", type=int, default=3, help="Number of iterations")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    results = []

    # Suppress logging during benchmark
    import logging
    logging.disable(logging.CRITICAL)

    if args.misinfo or (not args.misinfo and not args.deescalation):
        print("Running misinfo benchmark...")
        results.append(benchmark_misinfo_pipeline(args.iterations))

    if args.deescalation or (not args.misinfo and not args.deescalation):
        print("Running de-escalation benchmark...")
        results.append(benchmark_deescalation_pipeline(args.iterations))

    if args.json:
        print(json.dumps([r.to_dict() for r in results], indent=2))
    else:
        print_results(results)


if __name__ == "__main__":
    main()
