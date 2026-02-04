from typing import List

from summit.protocols.envelope import SummitEnvelope
from summit.tools.risk import ToolRisk, get_tool_risk


class HighRiskToolRule:
    def check(self, env: SummitEnvelope) -> list[str]:
        reasons = []
        for tc in env.tool_calls:
            risk = get_tool_risk(tc.name)
            if risk == ToolRisk.HIGH:
                # Check for approval_id
                # Assuming approval_id is in security context
                approval_id = env.security.get("approval_id")
                if not approval_id:
                    reasons.append(f"high_risk_tool_requires_approval:{tc.name}")
        return reasons
