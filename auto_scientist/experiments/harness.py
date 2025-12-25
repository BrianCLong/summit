import os
import json
import csv
import subprocess

def run_benchmark():
    # Ensure clean slate
    if os.path.exists("benchmark.jsonl"):
        os.remove("benchmark.jsonl")

    scenarios = [
        {"topic": "Safe Topic A", "expected": "success"},
        {"topic": "Safe Topic B", "expected": "success"},
        {"topic": "Unsafe Topic (pathogen)", "expected": "refined_success_or_fail"} # The mock generator might trigger this
    ]

    results = []

    print("Running Benchmark Suite...")
    for s in scenarios:
        print(f"  Running scenario: {s['topic']}")
        try:
            subprocess.run(
                ["python3", "-m", "auto_scientist.impl.src.main", "--topic", s['topic'], "--jsonl", "benchmark.jsonl"],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            results.append({"topic": s['topic'], "status": "OK"})
        except subprocess.CalledProcessError:
            results.append({"topic": s['topic'], "status": "CRASH"})

    # Aggregate metrics
    total = len(results)
    passed = sum(1 for r in results if r['status'] == "OK")

    print(f"Benchmark Complete: {passed}/{total} runs completed.")

    with open("results.csv", "w") as f:
        writer = csv.DictWriter(f, fieldnames=["topic", "status"])
        writer.writeheader()
        writer.writerows(results)

if __name__ == "__main__":
    run_benchmark()
