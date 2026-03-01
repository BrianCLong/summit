from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass
class ToolSpec:
    name: str
    schema: dict[str, Any]

class AgentRuntime:
    def __init__(self, tools: list[ToolSpec], policy: Any):
        self.tools = {t.name: t for t in tools}
        self.policy = policy

    def _call(self, step: dict[str, Any]) -> dict[str, Any]:
        return {"status": "success", "executed": step["tool"]}

    def execute(self, plan: list[dict[str, Any]]) -> dict[str, Any]:
        if os.environ.get("SUMMIT_ENABLE_AGENT_RUNTIME", "0") != "1":
            raise PermissionError("Agent runtime is disabled by feature flag")

        evidence = []
        for step in plan:
            tool_name = step["tool"]
            if hasattr(self.policy, "allow"):
                if not self.policy.allow(tool_name):
                    raise PermissionError("Denied by policy")
            elif hasattr(self.policy, "evaluate"):
                class MockToolCall:
                    def __init__(self, name):
                        self.name = name
                class MockEnvelope:
                    def __init__(self, tool):
                        self.sender = "agent"
                        self.tool_calls = [MockToolCall(tool)]
                        self.security = {"classification": "internal"}

                decision = self.policy.evaluate(MockEnvelope(tool_name))
                if not decision.allowed:
                    raise PermissionError(f"Denied by policy: {decision.reasons}")

            result = self._call(step)
            raw_evidence = json.dumps({"tool": tool_name, "result": result}, sort_keys=True)
            ev_hash = hashlib.sha256(raw_evidence.encode()).hexdigest()[:8]

            evidence.append({
                "tool": tool_name,
                "result": result,
                "evidence_id": f"EVID-AGENT-{ev_hash}",
                "claim_ref": "ITEM:CLAIM-01 | Summit original"
            })

        return {"evidence": evidence}
