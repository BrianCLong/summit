from typing import Dict, Optional
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

        # Governance check
        # For the engines, we consider "execute" mode to require explicit allow
        if req.mode == "execute":
            action = req.payload.get("action", "execute")
            connector = req.payload.get("connector")
            if not self._gate.is_allowed(action, connector):
                return RunResult(
                    ok=False,
                    evidence_path="",
                    summary={"error": f"Mode 'execute' for action '{action}' on connector '{connector}' blocked by governance"}
                )

        return self._engines[req.engine].run(req)

registry = EngineRegistry()
