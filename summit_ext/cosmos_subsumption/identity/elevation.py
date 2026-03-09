from __future__ import annotations
import time
from .adapter import IdentityAdapter
from ..evidence.emit import emit

class AdminElevation:
    def __init__(self, adapter: IdentityAdapter):
        self.adapter = adapter
        self.elevated_sessions = {}  # token -> expiry

    def request_elevation(self, token: str, duration_sec: int = 3600) -> bool:
        if self.adapter.elevate(token):
            expiry = time.time() + duration_sec
            self.elevated_sessions[token] = expiry

            # Emit evidence EVD-COSMOS-SERVER-ID-001
            emit(
                evidence_index={
                    "EVD-COSMOS-SERVER-ID-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
                },
                report={"status": "elevated", "notes": [f"Session elevated for {duration_sec}s"]},
                metrics={"counters": {"elevations_granted": 1}}
            )
            return True
        return False

    def is_elevated(self, token: str) -> bool:
        expiry = self.elevated_sessions.get(token)
        if expiry and time.time() < expiry:
            return True
        return False
