import json
import os
import datetime

def main():
    evid_id = "EVID-COGSEC-20260208-0001"
    output_dir = f"evidence/{evid_id}"
    os.makedirs(output_dir, exist_ok=True)

    # Deterministic report (no timestamps)
    report = {
        "items": [
            {
                "id": "node-1",
                "type": "Incident",
                "properties": {
                    "name": "Test Incident",
                    "confidence": 0.95
                }
            }
        ]
    }

    # Metrics
    metrics = {
        "node_count": 1,
        "edge_count": 0,
        "precision": 1.0
    }

    # Stamp (timestamps allowed here)
    stamp = {
        "id": evid_id,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": "1.0.0"
    }

    with open(f"{output_dir}/report.json", "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    with open(f"{output_dir}/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    with open(f"{output_dir}/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    print(f"Generated evidence in {output_dir}")

if __name__ == "__main__":
    main()
