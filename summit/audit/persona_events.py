from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class PersonaEvent:
  persona_id: str
  version: str
  evidence_id: str
  delta: dict[str, float]
  reason: str
  conversation_id_hash: Optional[str] = None  # never store raw IDs

CLASSIFICATION = "INTERNAL"
RETENTION_DAYS = 30
