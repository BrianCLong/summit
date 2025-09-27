"""Revocation registry helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Set


class JsonRevocationRegistry:
    """Revocation registry persisted as a JSON file."""

    def __init__(self, path: str | Path, initial: Iterable[str] | None = None) -> None:
        self.path = Path(path)
        self._revoked: Set[str] = set(initial or [])
        if self.path.exists():
            self._load()

    def _load(self) -> None:
        data = json.loads(self.path.read_text("utf-8"))
        revoked = data.get("revoked", [])
        if isinstance(revoked, list):
            self._revoked = set(map(str, revoked))

    def _persist(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"revoked": sorted(self._revoked)}
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    async def is_revoked(self, credential_id: str) -> bool:
        return credential_id in self._revoked

    async def revoke(self, credential_id: str) -> None:
        self._revoked.add(credential_id)
        self._persist()

    async def list(self) -> list[str]:
        return sorted(self._revoked)
