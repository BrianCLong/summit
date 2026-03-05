from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


class LedgerStorage:
    """File-backed deterministic storage for execution ledgers."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def save(self, payload: dict[str, Any]) -> str:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        body = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        self.path.write_text(body, encoding="utf-8")
        return hashlib.sha256(body.encode("utf-8")).hexdigest()
