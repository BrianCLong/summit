from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class PolicyDecision:
    action: str  # allow|deny|redact
    reasons: list[str]

@dataclass(frozen=True)
class PromptEvent:
    event_id: str
    tenant: str
    actor: str
    purpose: str
    classification: str
    model_id: str
    session_id: Optional[str] = None
    inputs_redacted: str = ""
    outputs_redacted: str = ""
    tools_called: Optional[list[str]] = None
    policy_decision: Optional[PolicyDecision] = None
    meta: Optional[dict[str, str]] = None
