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

        if req.mode == "execute":
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

            # Prepare audit metadata to be included in engine evidence
            audit_meta = {
                "mode": req.mode,
                "action": action,
                "connector": connector,
                "idempotency_key": req.idempotency_key,
                "governance": "approved"
            }

            # Create a new payload to avoid mutating the original
            new_payload = dict(req.payload)
            new_payload["_audit"] = audit_meta

            req = RunRequest(
                engine=req.engine,
                mode=req.mode,
                payload=new_payload,
                idempotency_key=req.idempotency_key
            )

        return self._engines[req.engine].run(req)

registry = EngineRegistry()
