from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass(frozen=True)
class Capability:
  capability_id: str
  version: str
  description: str
  input_schema: Dict
  output_schema: Dict
  constraints: Dict
  trust: Dict

@dataclass(frozen=True)
class RegistryDocument:
  version: str
  capabilities: List[Capability]
  signature: Optional[str] = None  # placeholder for cosign/DSSE integration
