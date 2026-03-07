import importlib
import json
import os
import sys
import time
from datetime import datetime

# Ensure root directory is in python path
sys.path.append(os.getcwd())

def load_class(path):
    module_path, class_name = path.rsplit('.', 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)

def run_benchmark(profile_path, output_dir):
    with open(profile_path) as f:
        profile = json.load(f)

    results = {
        "profile": profile["name"],
        "timestamp": datetime.utcnow().isoformat(),
        "models": {},
        "summary": {}
    }

    models = []
    for model_path in profile["models"]:
        model_class = load_class(model_path)
        model_instance = model_class()
        models.append(model_instance)
        results["models"][model_instance.MODEL_ID] = {
            "tasks": [],
            "metrics": {
                "total_latency_ms": 0,
                "total_tokens": 0,
                "avg_accuracy": 0
            }
        }

    for task in profile["tasks"]:
        print(f"Running task: {task['id']}")
        for model in models:
            output = model.generate(task["prompt"])

            # Simple keyword matching accuracy
            keywords_found = sum(1 for k in task["expected_keywords"] if k in output.text)
            accuracy = keywords_found / len(task["expected_keywords"]) if task["expected_keywords"] else 1.0

            task_result = {
                "task_id": task["id"],
                "latency_ms": output.latency_ms,
                "tokens_used": output.tokens_used,
                "accuracy": accuracy,
                "output_preview": output.text[:50] + "..."
            }

            model_results = results["models"][model.MODEL_ID]
            model_results["tasks"].append(task_result)
            model_results["metrics"]["total_latency_ms"] += output.latency_ms
            model_results["metrics"]["total_tokens"] += output.tokens_used

            # Accumulate accuracy for averaging later
            current_acc_sum = model_results["metrics"].get("_accuracy_sum", 0)
            model_results["metrics"]["_accuracy_sum"] = current_acc_sum + accuracy

    # Finalize metrics
    for model in models:
        model_id = model.MODEL_ID
        metrics = results["models"][model_id]["metrics"]
        metrics["avg_accuracy"] = metrics.pop("_accuracy_sum") / len(profile["tasks"])

        # Add cost efficiency score (mock logic: accuracy / latency)
        metrics["efficiency_score"] = metrics["avg_accuracy"] / (metrics["total_latency_ms"] / 1000) if metrics["total_latency_ms"] > 0 else 0

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Write report.json
    report_path = os.path.join(output_dir, "report.json")
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)

    # Write stamp.json
    stamp = {
        "timestamp": datetime.utcnow().isoformat(),
        "runner": "summit-benchmark-harness",
        "profile": profile["name"]
    }
    with open(os.path.join(output_dir, "stamp.json"), 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Benchmark complete. Results saved to {output_dir}")

if __name__ == "__main__":
    profile_path = "benchmarks/profiles/qwen3_5_vs_sonnet4_5.json"
    output_dir = "evidence/qwen3_5_medium"
    run_benchmark(profile_path, output_dir)
