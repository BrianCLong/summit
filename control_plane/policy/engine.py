import logging
import os
from typing import Any, Dict, Optional
import httpx
from ..agents.registry.models import AgentManifest

logger = logging.getLogger(__name__)

class PolicyEngine:
    def __init__(self, opa_url: Optional[str] = None):
        self.opa_url = opa_url or os.environ.get("OPA_URL", "http://localhost:8181")

    async def evaluate(self, action: str, agent: AgentManifest, user: Dict[str, Any], extra: Dict[str, Any] = {}) -> Dict[str, Any]:
        input_data = {
            "action": action,
            "agent": agent.model_dump(),
            "user": user,
            **extra
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.opa_url}/v1/data/summit/control_plane/policy/allow",
                    json={"input": input_data}
                )
                if response.status_code == 200:
                    result = response.json().get("result", False)
                    return {"allow": result}
        except Exception as e:
            logger.error(f"OPA evaluation failed: {e}")
        return self.evaluate_local(action, agent, user, extra)

    def evaluate_local(self, action: str, agent: AgentManifest, user: Dict[str, Any], extra: Dict[str, Any] = {}) -> Dict[str, Any]:
        if action == "execute_agent":
            classification = agent.governance.classification
            user_clearance = user.get("clearance")
            if classification == "public":
                return {"allow": True}
            if classification == "internal" and user_clearance in ["internal", "confidential", "restricted"]:
                return {"allow": True}
            if classification == "confidential" and user_clearance in ["confidential", "restricted"]:
                return {"allow": True}
            if classification == "restricted" and user_clearance == "restricted":
                return {"allow": True}
        elif action == "call_tool":
            tool_req = extra.get("tool", {})
            tool_name = tool_req.get("name")
            requested_perm = tool_req.get("requested_permission")
            for tool in agent.runtime.tools:
                if tool.name == tool_name:
                    if self._permission_sufficient(tool.permission, requested_perm):
                        return {"allow": True}
        elif action == "maestro_step":
            budget = extra.get("budget", {})
            if budget and budget.get("remaining_tokens", 0) > 0 and budget.get("remaining_steps", 0) > 0:
                return {"allow": True}
        return {"allow": False, "reason": "denied_by_policy"}

    def _permission_sufficient(self, granted: str, requested: str) -> bool:
        if granted == "admin":
            return True
        if granted == "read-write":
            return requested in ["read-write", "read-only"]
        if granted == "read-only":
            return requested == "read-only"
        if granted == "sandbox-only":
            return requested == "sandbox-only"
        return False
