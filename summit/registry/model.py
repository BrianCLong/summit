from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class RiskTier(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Capability:
  capability_id: str
  version: str
  description: str
  input_schema: dict
  output_schema: dict
  constraints: dict
  trust: dict

@dataclass(frozen=True)
class AgentDefinition:
    id: str
    name: str
    owner: str
    risk_tier: RiskTier
    version: str
    updated_at: str
    capabilities: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)
    data_domains: List[str] = field(default_factory=list)
    residency_tags: List[str] = field(default_factory=list)
    compliance_tags: List[str] = field(default_factory=list)
    allowed_backends: List[str] = field(default_factory=list)
    defaults: Dict = field(default_factory=dict)
    deprecated: bool = False

@dataclass(frozen=True)
class RegistryDocument:
  version: str
  capabilities: List[Capability] = field(default_factory=list)
  agents: List[AgentDefinition] = field(default_factory=list)
  signature: Optional[str] = None  # placeholder for cosign/DSSE integration
