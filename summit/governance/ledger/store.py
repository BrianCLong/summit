import json
from typing import List
from pathlib import Path
from summit.governance.events.schema import AuditEvent
from summit.governance.ledger.hashchain import HashChainLedger

class LedgerStore:
    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        self.ledger = HashChainLedger()
        self._load_state()

    def _load_state(self):
        if not self.filepath.exists():
            return

        last_line = ""
        try:
            with open(self.filepath, 'rb') as f:
                try:
                    f.seek(-2, 2)
                    while f.read(1) != b'\n':
                        f.seek(-2, 1)
                    last_line = f.readline().decode()
                except OSError:
                    # File too small or other issue, fallback to seek 0
                    f.seek(0)
                    last_line = f.read().decode()
        except Exception:
             # If file is empty or cannot be opened properly
             return

        if last_line and last_line.strip():
            try:
                data = json.loads(last_line)
                event = AuditEvent(**data)
                # We need to compute the hash of this event to set as last_hash for the next one
                self.ledger.last_hash = self.ledger._compute_hash(event)
            except Exception:
                 # Handle corruption or partial write
                 pass

    def append(self, event: AuditEvent):
        self.ledger.append(event)
        # Ensure directory exists
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(self.filepath, 'a', encoding='utf-8') as f:
            f.write(event.model_dump_json() + '\n')

    def read_all(self) -> List[AuditEvent]:
        if not self.filepath.exists():
            return []
        events = []
        with open(self.filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        events.append(AuditEvent(**json.loads(line)))
                    except json.JSONDecodeError:
                        continue
        return events

    def verify(self) -> bool:
        events = self.read_all()
        # Create a fresh ledger to verify the sequence from scratch
        verifier = HashChainLedger()
        return verifier.verify_chain(events)
