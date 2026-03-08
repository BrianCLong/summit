from __future__ import annotations

import os

from ..evidence.emit import emit


class SmartShield:
    def __init__(self):
        self.enabled = os.getenv("SUMMIT_SMARTSHIELD", "0") == "1"

    def protect(self, request_context: dict) -> bool:
        if not self.enabled:
            return True

        # Adaptive protection logic (prototype)
        # Rate limits + bot detection hooks
        is_bot = request_context.get("is_bot", False)
        if is_bot:
            # Emit evidence EVD-COSMOS-SERVER-SEC-001
            emit(
                evidence_index={
                    "EVD-COSMOS-SERVER-SEC-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
                },
                report={"status": "blocked", "notes": ["Bot detected and blocked by SmartShield"]},
                metrics={"counters": {"bots_blocked": 1}}
            )
            return False
        return True
