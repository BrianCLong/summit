import json
import time
import os
import subprocess
import sys
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="bench_metrics.json")
    args = parser.parse_args()

    # Create synthetic input
    # 1000 texts mixed with constraints
    texts = ["Normal text"] * 900 + ["It is inevitable that X cannot be trusted"] * 100

    input_data = {
        "texts": texts,
        "actor_id": "bench_actor",
        "evidence_ids": ["EVD-BENCH"],
        "history": {"role": {"originator": 100}, "style": "casual"}
    }

    with open("bench_input.json", "w") as f:
        json.dump(input_data, f)

    start_time = time.time()

    # Run analysis script
    cmd = [sys.executable, "scripts/narrative_analyze.py", "--input", "bench_input.json", "--output-dir", "bench_output"]
    subprocess.check_call(cmd)

    end_time = time.time()
    duration = end_time - start_time

    metrics = {
        "duration_seconds": duration,
        "texts_processed": len(texts),
        "throughput_tps": len(texts) / duration if duration > 0 else 0
    }

    with open(args.output, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Benchmark complete: {metrics}")

    # Clean up
    if os.path.exists("bench_input.json"):
        os.remove("bench_input.json")

if __name__ == "__main__":
    main()
