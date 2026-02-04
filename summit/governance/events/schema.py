from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
import uuid

def utc_now():
    return datetime.now(timezone.utc)

class PolicyDecision(BaseModel):
    decision: Literal["allow", "deny", "needs_approval"]
    policy_name: str
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=utc_now)

class AuditEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str
    event_type: str  # e.g., "PromptSubmitted", "ToolExecuted"
    actor: str
    timestamp: datetime = Field(default_factory=utc_now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    policy_decision: Optional[PolicyDecision] = None
    previous_hash: Optional[str] = None  # For hash chaining

class TraceStep(BaseModel):
    tool_name: str
    inputs: Dict[str, Any]
    outputs: Any
    timestamp: datetime = Field(default_factory=utc_now)

class ExecutionManifest(BaseModel):
    manifest_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_version: str
    trace: List[TraceStep] = Field(default_factory=list)
    tools_allowed: List[str]
    max_steps: int = 10
    created_at: datetime = Field(default_factory=utc_now)
