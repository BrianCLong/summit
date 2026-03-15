import argparse
import datetime
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path if not there
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

# Import the mock adapter and metrics functions
from adapters.mock_adapter import MockAdapter
from metrics import calculate_accuracy, calculate_hallucination_rate, calculate_consistency

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

def run_eval_harness(emit_evidence: str = None):
    print("Running Model Comparison Eval Harness...")

    # Load tasks
    tasks_path = FIXTURES_DIR / "tasks.json"
    with open(tasks_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    # The models we want to compare
    model_names = ["gpt-4-mock", "claude-3-mock", "llama-3-mock"]
    adapters = [MockAdapter(model_name) for model_name in model_names]

    # Store results per model
    report = {
        "models": {},
        "summary": {
            "total_tasks": len(tasks),
            "best_accuracy_model": None,
            "lowest_latency_model": None,
            "lowest_cost_model": None
        }
    }

    for model_name in model_names:
        report["models"][model_name] = {
            "metrics": {
                "avg_accuracy": 0.0,
                "avg_hallucination_rate": 0.0,
                "avg_consistency": 0.0,
                "total_latency_ms": 0,
                "total_cost": 0.0
            },
            "task_results": []
        }

    # Evaluation Loop
    for adapter in adapters:
        model_name = adapter.model_name
        model_results = report["models"][model_name]

        sum_accuracy = 0.0
        sum_hallucination = 0.0
        sum_consistency = 0.0

        for task in tasks:
            task_id = task["id"]
            task_type = task["type"]
            prompt = task["prompt"]
            expected = task["expected_output"]

            # Generate response from the mock adapter
            gen_result = adapter.generate(prompt, task_type)
            actual = gen_result["response"]
            latency = gen_result["latency_ms"]
            cost = gen_result["cost"]

            # Calculate metrics
            acc = calculate_accuracy(expected, actual, task_type)
            hall_rate = calculate_hallucination_rate(expected, actual, task_type)
            cons = calculate_consistency([actual], task_id) # Mocked to 1.0 for static harness

            # Accumulate
            sum_accuracy += acc
            sum_hallucination += hall_rate
            sum_consistency += cons
            model_results["metrics"]["total_latency_ms"] += latency
            model_results["metrics"]["total_cost"] += cost

            model_results["task_results"].append({
                "task_id": task_id,
                "task_type": task_type,
                "accuracy": acc,
                "hallucination_rate": hall_rate,
                "latency_ms": latency,
                "cost": cost
            })

        # Averages
        num_tasks = len(tasks)
        if num_tasks > 0:
            model_results["metrics"]["avg_accuracy"] = sum_accuracy / num_tasks
            model_results["metrics"]["avg_hallucination_rate"] = sum_hallucination / num_tasks
            model_results["metrics"]["avg_consistency"] = sum_consistency / num_tasks

    # Calculate bests
    best_acc = -1.0
    best_acc_model = None

    lowest_lat = float('inf')
    lowest_lat_model = None

    lowest_cost = float('inf')
    lowest_cost_model = None

    for model_name, data in report["models"].items():
        m = data["metrics"]
        if m["avg_accuracy"] > best_acc:
            best_acc = m["avg_accuracy"]
            best_acc_model = model_name

        if m["total_latency_ms"] < lowest_lat:
            lowest_lat = m["total_latency_ms"]
            lowest_lat_model = model_name

        if m["total_cost"] < lowest_cost:
            lowest_cost = m["total_cost"]
            lowest_cost_model = model_name

    report["summary"]["best_accuracy_model"] = best_acc_model
    report["summary"]["lowest_latency_model"] = lowest_lat_model
    report["summary"]["lowest_cost_model"] = lowest_cost_model

    # Save the local comparison report
    output_path = Path(__file__).resolve().parent / "comparison_report.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Harness completed successfully. Report saved to {output_path}")
    print(f"Summary: Best Accuracy -> {best_acc_model}, Lowest Latency -> {lowest_lat_model}, Lowest Cost -> {lowest_cost_model}")

    # Optional Evidence Emission
    if emit_evidence:
        output_dir = Path(emit_evidence).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        evd_id = "EVD-MODELCOMPARE-EVAL-001"

        evidence_report = {
            "evidence_id": evd_id,
            "item_slug": "model-comparison-harness",
            "area": "EVAL",
            "summary": f"Compared {len(model_names)} models across {len(tasks)} tasks.",
            "artifacts": ["metrics.json", "stamp.json"],
            "best_models": report["summary"]
        }

        metrics_file = {
            "evidence_id": evd_id,
            "model_comparison_metrics": {name: data["metrics"] for name, data in report["models"].items()}
        }

        stamp = {
            "evidence_id": evd_id,
            "created_at": datetime.datetime.now(datetime.UTC).isoformat()
        }

        (output_dir / "report.json").write_text(json.dumps(evidence_report, indent=2))
        (output_dir / "metrics.json").write_text(json.dumps(metrics_file, indent=2))
        (output_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

        print(f"Evidence emitted to {output_dir}")

        # Update evidence index
        index_path = ROOT_DIR / "evidence" / "index.json"
        if index_path.exists():
            try:
                index = json.loads(index_path.read_text())
                existing_item = next((item for item in index.get("items", []) if item["id"] == evd_id), None)
                rel_path = str(output_dir.relative_to(ROOT_DIR) / "report.json")

                if existing_item:
                    existing_item["path"] = rel_path
                else:
                    index.setdefault("items", []).append({
                        "id": evd_id,
                        "path": rel_path
                    })
                index_path.write_text(json.dumps(index, indent=2))
                print("Updated evidence/index.json")
            except Exception as e:
                print(f"Failed to update index.json: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Model Comparison Evaluation Harness")
    parser.add_argument("--emit-evidence", help="Directory to emit evidence artifacts")
    args = parser.parse_args()

    run_eval_harness(args.emit_evidence)
