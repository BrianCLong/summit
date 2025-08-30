"""
Hyperledger Fabric client stub for immutable provenance receipts.

Design:
- generate_hash(payload) -> sha256 digest
- submit_receipt(hash, metadata) -> tx_id
- verify_receipt(tx_id) -> stored metadata

Implementation is left as an integration task with an org's Fabric network.
This stub defines the interface to be used by the Node/Python services.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_STORE_PATH = Path(__file__).parent / "receipts_store.json"


@dataclass
class Receipt:
    tx_id: str
    hash: str
    metadata: dict


def generate_hash(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()


def _load_store() -> dict:
    if _STORE_PATH.exists():
        try:
            with _STORE_PATH.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_store(store: dict) -> None:
    tmp = _STORE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(store, f, indent=2, sort_keys=True)
    tmp.replace(_STORE_PATH)


def submit_receipt(hash_hex: str, metadata: dict) -> Receipt:
    """Persist a local receipt record and return a stable tx_id.

    This provides a functional MVP without requiring a Fabric network.
    The tx_id is deterministically derived from the hash + a metadata fingerprint.
    """
    # Derive deterministic tx id to avoid duplicates
    import hashlib

    meta_bytes = json.dumps(metadata, sort_keys=True, separators=(",", ":")).encode("utf-8")
    tx_id = "tx_" + hashlib.sha256(hash_hex.encode("utf-8") + meta_bytes).hexdigest()[:16]

    store = _load_store()
    store[tx_id] = {"tx_id": tx_id, "hash": hash_hex, "metadata": metadata}
    _save_store(store)
    return Receipt(tx_id=tx_id, hash=hash_hex, metadata=metadata)


def verify_receipt(tx_id: str) -> Receipt | None:
    store = _load_store()
    rec = store.get(tx_id)
    if not rec:
        return None
    return Receipt(**rec)
