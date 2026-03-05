from __future__ import annotations

import json
from pathlib import Path

from agents.todos.ledger import TodoLedger


def load_ledger(path: Path) -> TodoLedger:
    if not path.exists():
        return TodoLedger.empty()
    payload = json.loads(path.read_text())
    return TodoLedger.from_dict(payload)


def save_ledger(path: Path, ledger: TodoLedger) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ledger.to_dict(), indent=2, sort_keys=True) + "\n")
    return path
