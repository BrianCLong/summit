from summit.governance.ledger.store import LedgerStore
from summit.governance.events.schema import AuditEvent
from typing import List, Optional

class AEGStore:
    def __init__(self, ledger_path: str):
        self.ledger_store = LedgerStore(ledger_path)

    def record_event(self, event: AuditEvent):
        self.ledger_store.append(event)

    def get_by_trace_id(self, trace_id: str) -> List[AuditEvent]:
        # Linear scan for now. In prod, we'd use an index.
        all_events = self.ledger_store.read_all()
        return [e for e in all_events if e.trace_id == trace_id]
