# summit/cluster/drivers/vind/benchmarks.py
import time
import random

def run_lb_probe(cluster_name: str) -> dict:
    """
    Deploy a tiny echo app + Service type: LoadBalancer, wait for endpoint, curl it.
    Real implementation would use kubectl.
    """
    # Simulate some work
    time.sleep(0.1)
    # Simulate a probe result
    latency = random.uniform(10, 100)
    return {
        "status": "pass",
        "endpoint": f"http://lb-{cluster_name}.local",
        "latency_ms": round(latency, 2)
    }

def run_cache_benchmark(cluster_name: str) -> dict:
    """
    Pull an image twice and compare elapsed times.
    """
    # Simulate cold pull
    cold = random.uniform(5, 15)
    # Simulate warm pull (should be much faster)
    warm = random.uniform(0.1, 1.0)

    return {
        "cold_pull_s": round(cold, 2),
        "warm_pull_s": round(warm, 2),
        "improvement_factor": round(cold / warm, 1)
    }
