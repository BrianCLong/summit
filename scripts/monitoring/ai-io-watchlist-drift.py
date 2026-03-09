import json
import os
import sys


def check_drift():
    # Load previous version if available
    previous_path = "artifacts/watchlists/ai-io/report_previous.json"
    current_path = "artifacts/watchlists/ai-io/report.json"

    if not os.path.exists(current_path):
        print(f"Current watchlist not found at {current_path}")
        return

    if not os.path.exists(previous_path):
        print(f"Previous watchlist not found at {previous_path}, no drift to compute.")
        return

    with open(previous_path) as f:
        previous_data = json.load(f)

    with open(current_path) as f:
        current_data = json.load(f)

    # Simplified drift check based on evidence_id
    def get_ids(data):
        ids = set()
        for cat in ["research_programs", "bot_infra_trends", "detection_methods"]:
            for item in data.get(cat, []):
                ids.add(item["evidence_id"])
        return ids

    prev_ids = get_ids(previous_data)
    curr_ids = get_ids(current_data)

    added = curr_ids - prev_ids
    removed = prev_ids - curr_ids

    drift_report = {
        "added_ids": list(added),
        "removed_ids": list(removed),
        "has_drift": bool(added or removed)
    }

    with open("artifacts/watchlists/ai-io/drift.json", "w") as f:
        json.dump(drift_report, f, indent=2, sort_keys=True)

    print(f"Drift checked. Added: {len(added)}, Removed: {len(removed)}")

if __name__ == "__main__":
    check_drift()
