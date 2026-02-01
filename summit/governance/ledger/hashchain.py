import hashlib
import json
from typing import List
from summit.governance.events.schema import AuditEvent

class HashChainLedger:
    def __init__(self):
        self.last_hash: str = "0" * 64  # Genesis hash

    def _compute_hash(self, event: AuditEvent) -> str:
        # Create a canonical representation of the event
        data = event.model_dump(mode='json')
        # Ensure keys are sorted
        canonical_json = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

    def append(self, event: AuditEvent) -> str:
        """
        Appends an event to the ledger, linking it to the previous event.
        Returns the hash of the appended event.
        """
        event.previous_hash = self.last_hash
        current_hash = self._compute_hash(event)
        self.last_hash = current_hash
        return current_hash

    def verify_chain(self, events: List[AuditEvent]) -> bool:
        """
        Verifies the integrity of a list of events.
        """
        expected_prev_hash = "0" * 64
        for event in events:
            if event.previous_hash != expected_prev_hash:
                return False
            expected_prev_hash = self._compute_hash(event)
        return True
