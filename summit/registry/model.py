from dataclasses import dataclass
from typing import Dict, List, Optional


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
class RegistryDocument:
  version: str
  capabilities: list[Capability]
  signature: Optional[str] = None  # placeholder for cosign/DSSE integration
