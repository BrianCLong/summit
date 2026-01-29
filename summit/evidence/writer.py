import json
import os
from typing import Any, Dict
from .ids import validate_evd_id

def write_evidence(evd_id: str, report: Dict[str, Any], metrics: Dict[str, Any], stamp: Dict[str, Any], root: str = "artifacts/evidence") -> str:
    validate_evd_id(evd_id)
    out_dir = os.path.join(root, evd_id)
    os.makedirs(out_dir, exist_ok=True)
    for name, obj in (("report.json", report), ("metrics.json", metrics), ("stamp.json", stamp)):
        with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=2, sort_keys=True)
            f.write("\n")

    # Update index.json
    index_path = os.path.join(root, "index.json")
    index_data = []
    if os.path.exists(index_path):
        try:
             with open(index_path, "r", encoding="utf-8") as f:
                index_data = json.load(f)
        except json.JSONDecodeError:
            pass # Handle empty or corrupt file

    entry = {
        "evd_id": evd_id,
        "files": {
            "report": os.path.join(out_dir, "report.json"),
            "metrics": os.path.join(out_dir, "metrics.json"),
            "stamp": os.path.join(out_dir, "stamp.json")
        }
    }

    # Remove existing entry for this ID if any
    index_data = [x for x in index_data if x.get("evd_id") != evd_id]
    index_data.append(entry)

    # Sort by ID for determinism
    index_data.sort(key=lambda x: x["evd_id"])

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2, sort_keys=True)
        f.write("\n")

    return out_dir
