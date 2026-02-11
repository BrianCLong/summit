from __future__ import annotations

from typing import Dict, List, Optional

from summit.policy.engine import PolicyEngine
from summit.policy.rules.finance import FinancePolicyRule


def create_finance_engine(allow_tools_by_agent: dict[str, list[str]], hitl_classes: Optional[list[str]] = None) -> PolicyEngine:
    return PolicyEngine(
        allow_tools_by_agent=allow_tools_by_agent,
        rules=[FinancePolicyRule(hitl_required_classes=hitl_classes)]
    )
