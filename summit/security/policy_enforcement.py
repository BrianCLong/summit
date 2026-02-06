from typing import List, Dict, Set
from dataclasses import dataclass
from .audit import AuditLogger

@dataclass
class PolicyRequest:
    agent_id: str
    tool_name: str
    arguments: Dict
    classification: str = "internal"

@dataclass
class PolicyResult:
    allowed: bool
    reason: str

class SecurityPolicyEngine:
    def __init__(self, allowlist: Dict[str, List[str]], audit_logger: AuditLogger):
        self.allowlist = allowlist
        self.audit_logger = audit_logger

    def check(self, request: PolicyRequest) -> PolicyResult:
        allowed_tools = self.allowlist.get(request.agent_id, [])

        allowed = False
        reason = "DENY_BY_DEFAULT"

        if request.tool_name in allowed_tools:
            allowed = True
            reason = "ALLOWLIST_MATCH"
        else:
            reason = "TOOL_NOT_IN_ALLOWLIST"

        # Log the decision
        self.audit_logger.log_event(
            event_type="tool_call_check",
            details={
                "agent_id": request.agent_id,
                "tool_name": request.tool_name
            },
            decision="ALLOW" if allowed else "DENY",
            classification=request.classification
        )

        return PolicyResult(allowed, reason)
