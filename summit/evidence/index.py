from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

@dataclass(frozen=True)
class EvidenceItem:
    evidence_id: str
    paths: list[str]

def load_index(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))

def append_item(index_path: Path, item: EvidenceItem) -> None:
    idx = load_index(index_path) if index_path.exists() else {"version": "1.0", "items": {}}

    # Handle existing structure where items is a dict
    if "items" not in idx:
         idx["items"] = {}

    if isinstance(idx["items"], list):
        raise ValueError("Existing index.json has 'items' as a list, but dictionary is expected.")

    idx["items"][item.evidence_id] = {"files": item.paths}

    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(idx, indent=2, sort_keys=True) + "\n", encoding="utf-8")
