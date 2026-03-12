import json
import sys
import os
from detector import HallucinationDetector

def run_harness(test_bank_path, responses_path=None):
    """
    Run the hallucination evaluation harness.
    """
    if not os.path.exists(test_bank_path):
        print(f"Error: Test bank not found at {test_bank_path}")
        return

    with open(test_bank_path, 'r') as f:
        test_bank = json.load(f)

    ground_truth = test_bank.get("ground_truth", {})
    tasks = test_bank.get("tasks", [])

    detector = HallucinationDetector(ground_truth)

    # If no responses provided, we can't run evaluation
    if not responses_path or not os.path.exists(responses_path):
        print("No responses provided for evaluation.")
        return

    with open(responses_path, 'r') as f:
        responses_data = json.load(f)

    results = []
    total_hallucination_rate = 0
    hallucinated_responses_count = 0

    for task in tasks:
        task_id = task["id"]
        response_obj = next((r for r in responses_data if r["task_id"] == task_id), None)

        if response_obj:
            detection_result = detector.detect(response_obj["response"], task)

            result_entry = {
                "task_id": task_id,
                "query": task["query"],
                "hallucination_rate": detection_result["hallucination_rate"],
                "is_hallucinated": detection_result["is_hallucinated"],
                "unsupported_claims": detection_result["unsupported_claims"],
                "fabricated_entities": detection_result["fabricated_entities"]
            }
            results.append(result_entry)

            total_hallucination_rate += detection_result["hallucination_rate"]
            if detection_result["is_hallucinated"]:
                hallucinated_responses_count += 1

    aggregate_metrics = {
        "total_responses": len(results),
        "hallucinated_responses": hallucinated_responses_count,
        "average_hallucination_rate": total_hallucination_rate / max(1, len(results)),
        "overall_hallucination_percentage": (hallucinated_responses_count / max(1, len(results))) * 100
    }

    final_report = {
        "aggregate_metrics": aggregate_metrics,
        "per_response_results": results
    }

    print(json.dumps(final_report, indent=2))

    with open("evals/hallucination/results.json", "w") as f:
        json.dump(final_report, f, indent=2)

    print(f"\nEvaluation complete. Results saved to evals/hallucination/results.json")

if __name__ == "__main__":
    test_bank_file = "evals/hallucination/test_bank.json"
    responses_file = "evals/hallucination/mock_responses.json"

    if len(sys.argv) > 1:
        test_bank_file = sys.argv[1]
    if len(sys.argv) > 2:
        responses_file = sys.argv[2]

    run_harness(test_bank_file, responses_file)
