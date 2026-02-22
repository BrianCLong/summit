from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass(frozen=True)
class PolicyDecision:
    action: str  # allow|deny|redact
    reasons: List[str]

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
    tools_called: Optional[List[str]] = None
    policy_decision: Optional[PolicyDecision] = None
    meta: Optional[Dict[str, str]] = None
