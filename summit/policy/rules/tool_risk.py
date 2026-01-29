from typing import List
from summit.protocols.envelope import SummitEnvelope
from summit.tools.risk import get_tool_risk, ToolRisk

class HighRiskToolRule:
    def check(self, env: SummitEnvelope) -> List[str]:
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
