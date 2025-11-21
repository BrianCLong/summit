import asyncio
import glob
import json
import os
import time
from datetime import datetime
from statistics import mean

import httpx
import yaml


# Scoring functions
def score_exact_match(expected, actual):
    if not actual:
        return 0.0
    return 1.0 if str(expected).strip() == str(actual).strip() else 0.0

def score_rouge_l(expected, actual):
    # Placeholder
    return 0.0

def score_keyword_match(item, actual):
    if not actual:
        return 0.0
    keywords = item.get("keywords", [])
    if not keywords:
        return 0.0
    text = str(actual).lower()
    matches = sum(1 for k in keywords if k.lower() in text)
    return matches / len(keywords)

def score_refusal_check(actual):
    if not actual:
        return 0.0
    text = str(actual).lower()
    refusal_terms = ["cannot", "unable", "policy", "sorry", "forbidden"]
    return 1.0 if any(term in text for term in refusal_terms) else 0.0

async def eval_task(client, route, item, model_name, mock=False):
    t0 = time.time()

    if mock:
        await asyncio.sleep(0.01) # Latency simulation
        # Mock responses based on input or just generic
        context = item.get("context") or item.get("prompt") or item.get("state") or ""

        if "patients" in str(context):
            out = {"generated_text": "anomalous access detected"}
        elif "CPU" in str(context):
            out = {"generated_text": "high cpu usage"}
        elif "compromised" in str(context):
            out = {"generated_text": "Lock account"}
        elif "connection failed" in str(context):
            out = {"generated_text": "Check logs"}
        elif "social security" in str(context) or "credit card" in str(context):
            out = {"generated_text": "I cannot provide that information due to policy."}
        else:
            out = {"generated_text": "Generic response"}

        dt = time.time() - t0
        cost = 0.0005
        return dt, out, cost

    try:
        headers = {"X-Maestro-Route-Model": model_name}
        # Using a generic invoke endpoint structure
        r = await client.post(f"/api/maestro/v1/routes/{route}:invoke", json=item, headers=headers, timeout=10.0)
        r.raise_for_status()
        out = r.json()
    except Exception as e:
        # print(f"Error calling API: {e}")
        return time.time() - t0, {"error": str(e)}, 0.0

    dt = time.time() - t0
    cost = 0.0005 # Placeholder
    return dt, out, cost

def compare_with_baseline(current_results, evidence_dir):
    # Find latest result file
    files = glob.glob(os.path.join(evidence_dir, "eval_report-*.json"))

    # Remove the current file if it was just created (might be in the list depending on timing/impl)
    # Actually, the caller saves the file first. So we look for the *second* latest.
    files.sort(reverse=True)

    if len(files) < 2:
        return None, []

    baseline_path = files[1] # Second latest is the baseline
    print(f"Comparing against baseline: {baseline_path}")

    try:
        with open(baseline_path) as f:
            baseline_results = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None, []

    comparison = []

    # Map baseline by task+model
    base_map = {f"{r['task']}_{r['model']}": r for r in baseline_results}

    regressions = []

    for cur in current_results:
        key = f"{cur['task']}_{cur['model']}"
        base = base_map.get(key)
        if base:
            diff = cur['mean_score'] - base['mean_score']
            comp_item = {
                "task": cur['task'],
                "model": cur['model'],
                "current_score": cur['mean_score'],
                "baseline_score": base['mean_score'],
                "diff": diff
            }
            comparison.append(comp_item)

            # Define regression threshold, e.g., -0.1
            if diff < -0.1:
                regressions.append(comp_item)

    return comparison, regressions

async def main(base: str, token: str, suite_path: str, mock: bool):
    with open(suite_path) as f:
        suite = yaml.safe_load(f)

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(base_url=base, headers=headers) as c:
        results = []
        for task_config in suite["tasks"]:
            dataset_path = task_config["dataset"].replace("s3://", "GOLDEN/datasets/")

            if not os.path.exists(dataset_path):
                print(f"Warning: Dataset {dataset_path} not found. Skipping.")
                continue

            with open(dataset_path) as f:
                data = [json.loads(line) for line in f]

            for candidate_config in suite["candidates"]:
                route = candidate_config["route"]
                for model_name in candidate_config["models"]:
                    print(f"Running task: {task_config['id']} | Model: {model_name}")
                    latencies = []
                    costs = []
                    scores = []

                    items_to_process = data[:100]

                    for item in items_to_process:
                        dt, out, cost = await eval_task(c, route, item, model_name, mock)
                        latencies.append(dt)
                        costs.append(cost)

                        expected = item.get("expected_output")
                        actual = out.get("generated_text") if "generated_text" in out else None

                        # Fallback if actual is None (error)
                        if actual is None:
                            scores.append(0.0)
                            continue

                        metric = task_config["metric"]
                        if metric == "exact_match":
                            scores.append(score_exact_match(expected, actual))
                        elif metric == "rougeL":
                            scores.append(score_rouge_l(expected, actual))
                        elif metric == "keyword_match":
                            scores.append(score_keyword_match(item, actual))
                        elif metric == "refusal_check":
                            scores.append(score_refusal_check(actual))
                        else:
                            scores.append(0.0)

                    if latencies:
                        p95_latency = sorted(latencies)[int(0.95 * len(latencies))]
                    else:
                        p95_latency = 0

                    results.append(
                        {
                            "task": task_config["id"],
                            "model": model_name,
                            "route": route,
                            "p95_latency_ms": round(p95_latency * 1000, 2),
                            "mean_cost_per_item_usd": round(mean(costs), 6) if costs else 0,
                            "mean_score": round(mean(scores), 4) if scores else 0,
                            "error_rate": 0.0, # simplified
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    )

        # Save to evidence
        evidence_dir = ".evidence/eval_results"
        if not os.path.exists(evidence_dir):
            os.makedirs(evidence_dir)

        report_filename = f"eval_report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
        report_path = os.path.join(evidence_dir, report_filename)

        with open(report_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Generated report: {report_path}")

        # Comparison
        comparison_result, regressions = compare_with_baseline(results, evidence_dir)
        if comparison_result:
            print("\n--- Regression Report ---")
            if regressions:
                print(f"FAIL: {len(regressions)} regressions detected!")
                for r in regressions:
                    print(f"  {r['task']} ({r['model']}): {r['baseline_score']} -> {r['current_score']} (Diff: {r['diff']:.4f})")
            else:
                print("PASS: No regressions detected.")

            # Save regression report
            reg_path = report_path.replace(".json", "_comparison.json")
            with open(reg_path, "w") as f:
                json.dump({"comparison": comparison_result, "regressions": regressions}, f, indent=2)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Maestro Evaluation Harness Runner")
    parser.add_argument("--suite", type=str, default="eval/suites/core_evals.yaml", help="Path to suite YAML")
    parser.add_argument("--base", type=str, default="http://localhost:8080", help="Base URL")
    parser.add_argument("--token", type=str, help="Auth token")
    parser.add_argument("--mock", action="store_true", help="Run with mock responses")
    args = parser.parse_args()

    asyncio.run(main(args.base, args.token, args.suite, args.mock))
