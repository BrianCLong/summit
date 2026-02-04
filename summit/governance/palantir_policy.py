from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Optional
from summit.tools.risk import ToolRisk
from summit.governance.audit import AuditEvent, emit
from summit.integrations.palantir import SummitTool

@dataclass
class PalantirActionWrapper:
    """
    Wraps a Palantir-imported Action (SummitTool) with Summit Policy Governance.
    """
    tool: SummitTool
    actor_id: str

    def execute(self, params: dict[str, Any]) -> str:
        """
        Executes the action if policy allows. Emits audit events.
        """
        # 1. Policy Decision
        decision = "allow"
        if self.tool.risk == ToolRisk.HIGH:
            # In a real system, we'd check for an explicit approval token in params
            if not params.get("approval_token"):
                decision = "needs_approval"

        # 2. Emit Audit Event (Pre-execution)
        event = AuditEvent(
            event_type="tool_invocation",
            actor=self.actor_id,
            action=self.tool.name,
            decision=decision,
            metadata={"risk": str(self.tool.risk), "params": params}
        )
        emit(event)

        # 3. MPA & Break-Glass Checks
        if decision == "needs_approval":
            # Check for Multi-Party Authorization
            if self._check_mpa(params):
                decision = "allow (MPA)"
            # Check for Break-Glass
            elif self._check_break_glass(params):
                decision = "allow (Break-Glass)"
                # Emit SEVERITY 1 Alert
                emit(AuditEvent(
                    event_type="security_alert",
                    actor=self.actor_id,
                    action="break_glass",
                    decision="alert",
                    metadata={"severity": "CRITICAL", "reason": params.get("break_glass_reason")}
                ))

        # 4. Enforcement
        if decision not in ["allow", "allow (MPA)", "allow (Break-Glass)"]:
            raise PermissionError(f"Action '{self.tool.name}' denied: {decision}")

        # 5. Execution (Mocked)
        return f"Executed {self.tool.name} with {params} [{decision}]"

    def _check_mpa(self, params: dict) -> bool:
        """
        Validates Multi-Party Authorization.
        Requires 'approver_1' and 'approver_2' signatures in params.
        """
        a1 = params.get("approver_1")
        a2 = params.get("approver_2")
        # In real logic, verify crypto signatures and ensure a1 != a2 != actor
        return bool(a1 and a2 and a1 != a2 and a1 != self.actor_id)

    def _check_break_glass(self, params: dict) -> bool:
        """
        Validates Break-Glass Protocol.
        Requires 'break_glass_reason' and 'break_glass_token'.
        """
        reason = params.get("break_glass_reason")
        token = params.get("break_glass_token")
        # In real logic, verify token is a valid emergency token
        return bool(reason and token == "EMERGENCY_OVERRIDE")
