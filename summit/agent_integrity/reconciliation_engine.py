import hashlib
import json
from typing import Any, Dict


class ReconciliationEngine:
    def _hash_record(self, record: Dict[str, Any]) -> str:
        """
        Generate a deterministic hash for a given record.
        """
        serialized = json.dumps(record, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def reconcile(self, record1: Dict[str, Any], record2: Dict[str, Any]) -> bool:
        """
        Reconcile two entities by comparing their deterministic hashes.
        In reality, this would normalize schemas before hashing.
        """
        # Minimal mock: Ensure both exist and have matching core IDs
        id1 = record1.get("id") or record1.get("entity_id")
        id2 = record2.get("id") or record2.get("entity_id")

        if not id1 or not id2:
            return False

        return id1 == id2

    def generate_reconciliation_hash(self, record: Dict[str, Any]) -> str:
        return self._hash_record(record)
