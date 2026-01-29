import json
import os
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "evidence"

EVIDENCE_IDS = [
    "EVD-nato-cogres-narrative-EVIDENCE-001",
    "EVD-nato-cogres-narrative-POLICY-002",
    "EVD-nato-cogres-narrative-GRAPH-003",
    "EVD-nato-cogres-narrative-EVAL-004",
    "EVD-nato-cogres-narrative-CAMPAIGN-005",
    "EVD-nato-cogres-narrative-MARKERS-006"
]

ITEM_SLUG = "nato-cogres-narrative"

def create_artifacts(evd_id):
    dir_path = EVIDENCE_DIR / evd_id
    dir_path.mkdir(exist_ok=True, parents=True)

    # Report
    report = {
        "evd_id": evd_id,
        "item_slug": ITEM_SLUG,
        "summary": f"Placeholder evidence for {evd_id}",
        "risks": ["Narrative manipulation", "Cognitive attacks"],
        "mitigations": ["Policy gates", "Graph analysis", "Detectors"]
    }
    with open(dir_path / "report.json", "w") as f:
        json.dump(report, f, indent=2)

    # Metrics
    metrics = {
        "status": "initialized",
        "timestamp": datetime.now().isoformat()
    }
    with open(dir_path / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Stamp
    stamp = {
        "created_at": datetime.now().isoformat()
    }
    with open(dir_path / "stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)

    return f"evidence/{evd_id}/report.json"

def update_index(id_path_map):
    index_path = EVIDENCE_DIR / "index.json"
    if index_path.exists():
        with open(index_path, "r") as f:
            index = json.load(f)
    else:
        index = {"version": 1, "items": {}}

    for evd_id, path in id_path_map.items():
        index["items"][evd_id] = path

    with open(index_path, "w") as f:
        json.dump(index, f, indent=2, sort_keys=True)

def main():
    id_path_map = {}
    for evd_id in EVIDENCE_IDS:
        path = create_artifacts(evd_id)
        id_path_map[evd_id] = path
        print(f"Created artifacts for {evd_id}")

    update_index(id_path_map)
    print("Updated evidence/index.json")

if __name__ == "__main__":
    main()
