import json
import os
from typing import Any, Dict, List


def ingest_from_file(filepath: str) -> list[dict[Any, Any]]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Fixture not found: {filepath}")

    with open(filepath) as f:
        data = json.load(f)

    # Expecting either a list of runs or a GH API response object
    if isinstance(data, dict) and "workflow_runs" in data:
        return data["workflow_runs"]
    elif isinstance(data, list):
        return data
    else:
        return []

def ingest_directory(directory: str) -> list[dict[Any, Any]]:
    all_runs = []
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            all_runs.extend(ingest_from_file(os.path.join(directory, filename)))
    return all_runs
