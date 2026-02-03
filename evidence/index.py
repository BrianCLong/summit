import json
from pathlib import Path
from typing import Any, Dict, List


def build_index(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    sorted_items = sorted(items, key=lambda item: item["evidence_id"])
    return {
        "version": "0.1.0",
        "items": sorted_items
    }


def write_index(path: Path, items: List[Dict[str, Any]]) -> None:
    index = build_index(items)
    path.write_text(json.dumps(index, sort_keys=True) + "\n")
