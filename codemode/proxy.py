from typing import Any, Dict

from codemode.audit import AuditLogger
from codemode.policy import SandboxPolicy


class CodeModeProxy:
    def __init__(self, policy: SandboxPolicy, audit_logger: AuditLogger):
        self.policy = policy
        self.audit = audit_logger

    def dispatch(self, tool_name: str, args: dict[str, Any]) -> Any:
        # 1. Audit Request
        self.audit.log_event("tool_call", tool_name, args)

        # 2. Check ACL (Stub)
        # Deny sensitive tools if network/env is restricted
        if tool_name.startswith("admin_") or tool_name == "system_shell":
             self.audit.log_event("tool_denied", tool_name, args, status="denied")
             raise PermissionError(f"Tool {tool_name} denied by proxy ACL")

        # 3. Call actual implementation (Stub)
        # Here we would connect to the Summit Runtime or MCP client
        result = {"status": "ok", "data": "stub result"}

        # 4. Audit Response
        self.audit.log_event("tool_result", tool_name, result)
        return result
