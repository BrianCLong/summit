"""
Performance Benchmarking Script for Predictive Threat Suite

Measures latency, throughput, and resource usage under various loads.

Usage:
    python benchmark.py
    python benchmark.py --duration 300 --concurrent 50
"""

import time
import argparse
import statistics
import concurrent.futures
from typing import List, Dict, Any
from datetime import datetime
import requests
import numpy as np
import json


class BenchmarkResults:
    """Container for benchmark results."""

    def __init__(self, name: str):
        self.name = name
        self.latencies: List[float] = []
        self.errors: List[str] = []
        self.start_time = time.time()
        self.end_time = None

    def add_latency(self, latency: float):
        """Add a successful request latency."""
        self.latencies.append(latency)

    def add_error(self, error: str):
        """Add an error."""
        self.errors.append(error)

    def finish(self):
        """Mark benchmark as finished."""
        self.end_time = time.time()

    def get_summary(self) -> Dict[str, Any]:
        """Get benchmark summary statistics."""
        if not self.latencies:
            return {
                "name": self.name,
                "total_requests": 0,
                "successful_requests": 0,
                "failed_requests": len(self.errors),
                "error_rate": 1.0 if self.errors else 0.0
            }

        duration = self.end_time - self.start_time if self.end_time else time.time() - self.start_time
        total_requests = len(self.latencies) + len(self.errors)

        return {
            "name": self.name,
            "duration_seconds": duration,
            "total_requests": total_requests,
            "successful_requests": len(self.latencies),
            "failed_requests": len(self.errors),
            "throughput_rps": len(self.latencies) / duration if duration > 0 else 0,
            "error_rate": len(self.errors) / total_requests if total_requests > 0 else 0,
            "latency": {
                "min_ms": min(self.latencies) * 1000,
                "max_ms": max(self.latencies) * 1000,
                "mean_ms": statistics.mean(self.latencies) * 1000,
                "median_ms": statistics.median(self.latencies) * 1000,
                "p50_ms": np.percentile(self.latencies, 50) * 1000,
                "p75_ms": np.percentile(self.latencies, 75) * 1000,
                "p90_ms": np.percentile(self.latencies, 90) * 1000,
                "p95_ms": np.percentile(self.latencies, 95) * 1000,
                "p99_ms": np.percentile(self.latencies, 99) * 1000,
                "stddev_ms": statistics.stdev(self.latencies) * 1000 if len(self.latencies) > 1 else 0,
            }
        }

    def print_summary(self):
        """Print a formatted summary."""
        summary = self.get_summary()

        print(f"\n{'='*80}")
        print(f"  {self.name}")
        print(f"{'='*80}")

        if summary["total_requests"] == 0:
            print("  No requests completed")
            return

        print(f"\n  Duration:              {summary['duration_seconds']:.2f}s")
        print(f"  Total Requests:        {summary['total_requests']}")
        print(f"  Successful:            {summary['successful_requests']}")
        print(f"  Failed:                {summary['failed_requests']}")
        print(f"  Throughput:            {summary['throughput_rps']:.2f} req/s")
        print(f"  Error Rate:            {summary['error_rate']*100:.2f}%")

        if summary["successful_requests"] > 0:
            lat = summary["latency"]
            print(f"\n  Latency Distribution:")
            print(f"    Min:                 {lat['min_ms']:.2f}ms")
            print(f"    Mean:                {lat['mean_ms']:.2f}ms")
            print(f"    Median:              {lat['median_ms']:.2f}ms")
            print(f"    P75:                 {lat['p75_ms']:.2f}ms")
            print(f"    P90:                 {lat['p90_ms']:.2f}ms")
            print(f"    P95:                 {lat['p95_ms']:.2f}ms")
            print(f"    P99:                 {lat['p99_ms']:.2f}ms")
            print(f"    Max:                 {lat['max_ms']:.2f}ms")
            print(f"    Std Dev:             {lat['stddev_ms']:.2f}ms")


class PredictiveSuiteBenchmark:
    """Benchmark suite for Predictive Threat Suite."""

    def __init__(self, base_url: str = "http://localhost:8091"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()

    def _generate_forecast_payload(self, size: int = 100) -> Dict[str, Any]:
        """Generate a sample forecast payload."""
        np.random.seed(42)
        historical_data = list(100 + np.cumsum(np.random.randn(size)))

        return {
            "signal_type": "event_count",
            "entity_id": f"benchmark_{int(time.time())}",
            "historical_data": historical_data,
            "horizon": "24h",
            "confidence_level": 0.95,
            "model_type": "arima"
        }

    def _generate_simulation_payload(self) -> Dict[str, Any]:
        """Generate a sample simulation payload."""
        return {
            "entity_id": f"benchmark_{int(time.time())}",
            "current_state": {
                "threat_level": "high",
                "error_rate": 0.05,
                "latency_p95": 450,
                "request_rate": 100,
                "resource_utilization": 0.7
            },
            "interventions": [
                {
                    "type": "deploy_patch",
                    "timing": "immediate",
                    "parameters": {"rollout_percentage": 50}
                },
                {
                    "type": "rate_limit",
                    "timing": "immediate",
                    "parameters": {"limit": 1000}
                }
            ],
            "timeframe": "24h"
        }

    def benchmark_forecast(self, num_requests: int = 100) -> BenchmarkResults:
        """Benchmark forecast generation."""
        results = BenchmarkResults("Forecast Generation Benchmark")

        print(f"\n🚀 Running forecast benchmark ({num_requests} requests)...")

        for i in range(num_requests):
            payload = self._generate_forecast_payload()
            start = time.time()

            try:
                response = self.session.post(
                    f"{self.base_url}/api/forecast",
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()
                latency = time.time() - start
                results.add_latency(latency)

                if (i + 1) % 10 == 0:
                    print(f"  Progress: {i+1}/{num_requests} requests completed")

            except Exception as e:
                results.add_error(str(e))

        results.finish()
        return results

    def benchmark_simulation(self, num_requests: int = 100) -> BenchmarkResults:
        """Benchmark simulation."""
        results = BenchmarkResults("Simulation Benchmark")

        print(f"\n🚀 Running simulation benchmark ({num_requests} requests)...")

        for i in range(num_requests):
            payload = self._generate_simulation_payload()
            start = time.time()

            try:
                response = self.session.post(
                    f"{self.base_url}/api/simulate",
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()
                latency = time.time() - start
                results.add_latency(latency)

                if (i + 1) % 10 == 0:
                    print(f"  Progress: {i+1}/{num_requests} requests completed")

            except Exception as e:
                results.add_error(str(e))

        results.finish()
        return results

    def benchmark_concurrent(
        self,
        endpoint: str,
        payload_generator,
        num_requests: int = 100,
        max_workers: int = 10
    ) -> BenchmarkResults:
        """Benchmark with concurrent requests."""
        results = BenchmarkResults(f"Concurrent {endpoint} Benchmark ({max_workers} workers)")

        print(f"\n🚀 Running concurrent benchmark ({num_requests} requests, {max_workers} workers)...")

        def make_request(i: int):
            payload = payload_generator()
            start = time.time()

            try:
                response = self.session.post(
                    f"{self.base_url}{endpoint}",
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()
                latency = time.time() - start
                return ("success", latency)

            except Exception as e:
                return ("error", str(e))

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(make_request, i) for i in range(num_requests)]

            for i, future in enumerate(concurrent.futures.as_completed(futures)):
                result = future.result()
                if result[0] == "success":
                    results.add_latency(result[1])
                else:
                    results.add_error(result[1])

                if (i + 1) % 10 == 0:
                    print(f"  Progress: {i+1}/{num_requests} requests completed")

        results.finish()
        return results

    def benchmark_data_size_impact(self) -> List[BenchmarkResults]:
        """Benchmark impact of data size on performance."""
        results = []
        data_sizes = [10, 50, 100, 500, 1000]

        print(f"\n🚀 Running data size impact benchmark...")

        for size in data_sizes:
            benchmark_results = BenchmarkResults(f"Forecast with {size} data points")

            for i in range(20):
                payload = self._generate_forecast_payload(size=size)
                start = time.time()

                try:
                    response = self.session.post(
                        f"{self.base_url}/api/forecast",
                        json=payload,
                        timeout=30
                    )
                    response.raise_for_status()
                    latency = time.time() - start
                    benchmark_results.add_latency(latency)

                except Exception as e:
                    benchmark_results.add_error(str(e))

            benchmark_results.finish()
            results.append(benchmark_results)

        return results

    def benchmark_sustained_load(self, duration_seconds: int = 60) -> BenchmarkResults:
        """Benchmark sustained load over time."""
        results = BenchmarkResults(f"Sustained Load ({duration_seconds}s)")

        print(f"\n🚀 Running sustained load benchmark ({duration_seconds}s)...")

        start_time = time.time()
        request_count = 0

        while time.time() - start_time < duration_seconds:
            payload = self._generate_forecast_payload()
            req_start = time.time()

            try:
                response = self.session.post(
                    f"{self.base_url}/api/forecast",
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()
                latency = time.time() - req_start
                results.add_latency(latency)

            except Exception as e:
                results.add_error(str(e))

            request_count += 1
            if request_count % 10 == 0:
                elapsed = time.time() - start_time
                print(f"  Progress: {elapsed:.1f}s / {duration_seconds}s ({request_count} requests)")

        results.finish()
        return results


def check_service_health(base_url: str) -> bool:
    """Check if the service is healthy before benchmarking."""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"❌ Service health check failed: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Benchmark Predictive Threat Suite")
    parser.add_argument(
        "--url",
        default="http://localhost:8091",
        help="Base URL of the Predictive Suite API"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Duration for sustained load test (seconds)"
    )
    parser.add_argument(
        "--concurrent",
        type=int,
        default=10,
        help="Number of concurrent workers"
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=100,
        help="Number of requests for sequential benchmarks"
    )
    parser.add_argument(
        "--output",
        help="Output file for results (JSON)"
    )

    args = parser.parse_args()

    print("="*80)
    print("  Predictive Threat Suite - Performance Benchmark")
    print("="*80)
    print(f"\n  Target: {args.url}")
    print(f"  Time:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Check service health
    if not check_service_health(args.url):
        print("\n❌ Service is not available. Please start the service first.")
        return 1

    print("\n✅ Service is healthy. Starting benchmarks...")

    benchmark = PredictiveSuiteBenchmark(args.url)
    all_results = {}

    # Run benchmarks
    try:
        # 1. Sequential forecast benchmark
        forecast_results = benchmark.benchmark_forecast(args.requests)
        forecast_results.print_summary()
        all_results["sequential_forecast"] = forecast_results.get_summary()

        # 2. Sequential simulation benchmark
        simulation_results = benchmark.benchmark_simulation(args.requests)
        simulation_results.print_summary()
        all_results["sequential_simulation"] = simulation_results.get_summary()

        # 3. Concurrent forecast benchmark
        concurrent_forecast = benchmark.benchmark_concurrent(
            "/api/forecast",
            benchmark._generate_forecast_payload,
            args.requests,
            args.concurrent
        )
        concurrent_forecast.print_summary()
        all_results["concurrent_forecast"] = concurrent_forecast.get_summary()

        # 4. Concurrent simulation benchmark
        concurrent_simulation = benchmark.benchmark_concurrent(
            "/api/simulate",
            benchmark._generate_simulation_payload,
            args.requests,
            args.concurrent
        )
        concurrent_simulation.print_summary()
        all_results["concurrent_simulation"] = concurrent_simulation.get_summary()

        # 5. Data size impact
        data_size_results = benchmark.benchmark_data_size_impact()
        print(f"\n{'='*80}")
        print(f"  Data Size Impact Analysis")
        print(f"{'='*80}\n")

        all_results["data_size_impact"] = {}
        for result in data_size_results:
            summary = result.get_summary()
            size = result.name.split()[2]
            all_results["data_size_impact"][size] = summary
            print(f"  {result.name:30} | P95: {summary['latency']['p95_ms']:.2f}ms")

        # 6. Sustained load
        sustained_results = benchmark.benchmark_sustained_load(args.duration)
        sustained_results.print_summary()
        all_results["sustained_load"] = sustained_results.get_summary()

    except KeyboardInterrupt:
        print("\n\n⚠️  Benchmark interrupted by user")

    # Save results to file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(all_results, f, indent=2)
        print(f"\n💾 Results saved to: {args.output}")

    print("\n✅ Benchmark completed!")
    return 0


if __name__ == "__main__":
    exit(main())
