from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


class MemoryStore:
    """Persistent hash-keyed memory store for workstation runs."""

    def __init__(self, path: Path, *, redact_raw_prompts: bool = True) -> None:
        self.path = path
        self.redact_raw_prompts = redact_raw_prompts
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("{}\n", encoding="utf-8")

    @staticmethod
    def hash_key(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _load(self) -> dict[str, Any]:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Corrupted memory store; unable to decode JSON") from exc

    def _save(self, payload: dict[str, Any]) -> None:
        self.path.write_text(
            json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    def put(self, key: str, value: dict[str, Any]) -> str:
        hashed = self.hash_key(key)
        record = dict(value)
        if self.redact_raw_prompts and "prompt" in record:
            record.pop("prompt")
        payload = self._load()
        payload[hashed] = record
        self._save(payload)
        return hashed

    def get(self, key: str) -> dict[str, Any] | None:
        hashed = self.hash_key(key)
        payload = self._load()
        value = payload.get(hashed)
        if isinstance(value, dict):
            return value
        return None
