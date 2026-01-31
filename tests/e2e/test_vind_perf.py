# tests/e2e/test_vind_perf.py
import pytest
from summit.cluster.drivers.vind.benchmarks import run_lb_probe, run_cache_benchmark

def test_vind_performance():
    """
    Smoke test for benchmarking logic.
    """
    cluster_name = "summit-perf"
    lb_results = run_lb_probe(cluster_name)
    cache_results = run_cache_benchmark(cluster_name)

    assert lb_results["status"] == "pass"
    assert "latency_ms" in lb_results
    assert cache_results["warm_pull_s"] < cache_results["cold_pull_s"]
    assert "improvement_factor" in cache_results
