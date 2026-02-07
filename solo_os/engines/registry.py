from typing import Dict, Optional, Any
from .base import Engine, RunRequest, RunResult
from solo_os.governance.gate import GovernanceGate

class EngineRegistry:
    def __init__(self, gate: Optional[GovernanceGate] = None):
        self._engines: Dict[str, Engine] = {}
        self._gate = gate or GovernanceGate()

    def register(self, engine: Engine):
        self._engines[engine.name] = engine

    def run(self, req: RunRequest) -> RunResult:
        if req.engine not in self._engines:
            return RunResult(
                ok=False,
                evidence_path="",
                summary={"error": f"Engine '{req.engine}' not found"}
            )

        # Governance and Execution Checks
        if req.mode == "execute":
            # Idempotency check
            if not req.idempotency_key:
                return RunResult(
                    ok=False,
                    evidence_path="",
                    summary={"error": "Mode 'execute' requires an idempotency_key"}
                )

            action = req.payload.get("action", "execute")
            connector = req.payload.get("connector")
            if not self._gate.is_allowed(action, connector):
                return RunResult(
                    ok=False,
                    evidence_path="",
                    summary={"error": f"Mode 'execute' for action '{action}' on connector '{connector}' blocked by governance"}
                )

            # For audit, we might want to pass an audit flag or handle it here.
            # But the evidence writing happens inside the engine's run() method usually.
            # We can inject audit info into the payload or handle it in the result.
            req.payload["_audit"] = {
                "timestamp": "captured_at_write", # helper will handle
                "mode": req.mode,
                "action": action,
                "connector": connector,
                "idempotency_key": req.idempotency_key,
                "governance": "approved"
            }

        return self._engines[req.engine].run(req)

registry = EngineRegistry()
