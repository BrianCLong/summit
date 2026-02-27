import os
import json
import sys
import glob
from collections import defaultdict
import datetime

# Add root directory to path
sys.path.append(os.getcwd())

from telemetry.plan_sampler import PlanSampler

def generate_heatmap(samples_dir: str = ".plan-samples"):
    """
    Generates a heatmap of plan stability from collected samples.
    """
    if not os.path.exists(samples_dir):
        print(f"No samples directory found at {samples_dir}. Creating empty report.")
        return {}

    sampler = PlanSampler()
    plan_history = defaultdict(list)

    # Iterate over all JSON sample files
    for sample_file in glob.glob(os.path.join(samples_dir, "*.json")):
        try:
            with open(sample_file, "r") as f:
                data = json.load(f)

            query_sig = data.get("query_signature", "unknown")
            plan = data.get("plan", {})
            timestamp = data.get("timestamp", datetime.datetime.now().isoformat())

            fingerprint = sampler.get_plan_fingerprint(plan)

            plan_history[query_sig].append({
                "fingerprint": fingerprint,
                "timestamp": timestamp
            })

        except Exception as e:
            print(f"Error processing {sample_file}: {e}")

    # Analyze stability
    report = {
        "generated_at": datetime.datetime.now().isoformat(),
        "queries": {}
    }

    for query_sig, history in plan_history.items():
        total_samples = len(history)
        unique_fingerprints = set(h["fingerprint"] for h in history)

        # Calculate stability score (1.0 = perfectly stable)
        stability = 1.0 / len(unique_fingerprints) if unique_fingerprints else 0.0

        # Sort history by time
        history.sort(key=lambda x: x["timestamp"])

        # Check for recent drift (last 10 samples vs previous)
        is_drifting = False
        if total_samples > 10:
            recent_fps = {h["fingerprint"] for h in history[-5:]}
            older_fps = {h["fingerprint"] for h in history[:-5]}
            # If we see a fingerprint in recent that wasn't in older, it's a drift
            if not recent_fps.issubset(older_fps):
                is_drifting = True

        report["queries"][query_sig] = {
            "total_samples": total_samples,
            "unique_plans": len(unique_fingerprints),
            "stability_score": stability,
            "is_drifting": is_drifting,
            "latest_fingerprint": history[-1]["fingerprint"] if history else None
        }

    return report

def main():
    report = generate_heatmap()
    print(json.dumps(report, indent=2))

    # Save artifact
    os.makedirs("artifacts/plan-stability", exist_ok=True)
    with open("artifacts/plan-stability/heatmap.json", "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
