import json
from pathlib import Path
from typing import Any, Dict


def write_ledger(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, sort_keys=True, indent=2)
        handle.write("\n")
