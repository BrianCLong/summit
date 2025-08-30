from __future__ import annotations

import hashlib
import json
from pathlib import Path

import httpx


class SyncManager:
    """Store inference results offline and sync when connectivity is restored."""

    def __init__(self, storage_dir: Path | str, endpoint: str) -> None:
        self.storage_dir = Path(storage_dir)
        self.endpoint = endpoint
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    def store(self, record: dict) -> Path:
        """Persist a record locally with a checksum for validation."""
        data = json.dumps(record, sort_keys=True).encode()
        checksum = hashlib.sha256(data).hexdigest()
        record_with_sum = {**record, "checksum": checksum}
        path = self.storage_dir / f"{checksum}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record_with_sum, f)
        return path

    # ------------------------------------------------------------------
    def sync(self, client: httpx.Client | None = None) -> None:
        """Attempt to upload stored records to the central service."""
        own_client = client or httpx.Client()
        for path in list(self.storage_dir.glob("*.json")):
            with open(path, encoding="utf-8") as f:
                record = json.load(f)
            try:
                resp = own_client.post(self.endpoint, json=record, timeout=5.0)
                if resp.status_code == 200 and resp.json().get("checksum") == record.get(
                    "checksum"
                ):
                    path.unlink()  # Delete once server confirms
            except Exception:
                # Connectivity issues are ignored; records remain for later attempts
                pass
        if client is None:
            own_client.close()
