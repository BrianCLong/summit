from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Classification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ToolPermission(str, Enum):
    READ_ONLY = "read-only"
    READ_WRITE = "read-write"
    ADMIN = "admin"
    SANDBOX_ONLY = "sandbox-only"

class ReplayMode(str, Enum):
    DETERMINISTIC = "deterministic"
    BEST_EFFORT = "best-effort"
    NONE = "none"

class LogLevel(str, Enum):
    INFO = "info"
    DEBUG = "debug"
    AUDIT = "audit"
    TRACE = "trace"

class SessionLimits(BaseModel):
    max_steps: int = 25
    max_time_ms: int = 300000

class ResourceQuotas(BaseModel):
    max_tokens: Optional[int] = None
    max_cost_usd: Optional[float] = None

class Boundaries(BaseModel):
    session_limits: Optional[SessionLimits] = Field(default_factory=SessionLimits)
    resource_quotas: Optional[ResourceQuotas] = None

class Governance(BaseModel):
    owner: str
    classification: Classification
    policy_set: str
    risk_level: RiskLevel = RiskLevel.MEDIUM
    boundaries: Optional[Boundaries] = None

class ModelParameters(BaseModel):
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    effort: Optional[str] = None

class Model(BaseModel):
    provider: str
    name: str
    parameters: Optional[ModelParameters] = None

class Instructions(BaseModel):
    source: str
    sha256: str

class Tool(BaseModel):
    name: str
    permission: ToolPermission
    timeout_ms: int = 30000

class Runtime(BaseModel):
    model: Model
    instructions: Instructions
    tools: List[Tool]
    output_schema: Optional[Dict[str, Any]] = None

class Experience(BaseModel):
    onboarding_flow: str
    feedback_loops: List[str] = Field(default_factory=list)
    learning_enabled: bool = False

class Context(BaseModel):
    shared_context_id: Optional[str] = None
    graph_grounding: bool = True
    persistence: str = "session"

class Evidence(BaseModel):
    log_level: LogLevel = LogLevel.AUDIT
    required_artifacts: List[str]
    replay_mode: ReplayMode = ReplayMode.DETERMINISTIC

class AgentManifest(BaseModel):
    agent_id: str
    version: str
    governance: Governance
    runtime: Runtime
    evidence: Evidence
    experience: Experience
    context: Context
