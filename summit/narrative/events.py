from dataclasses import dataclass
from typing import List, Dict

@dataclass(frozen=True)
class DetectorEvent:
    event_id: str              # stable hash
    detector: str              # e.g., "constraint_signature"
    score: float
    threshold: float
    window: Dict[str, str]     # {"start": "...", "end": "..."} - optional strings
    evidence_ids: List[str]
    metadata: Dict[str, str]

@dataclass(frozen=True)
class ConstraintSignature:
    signature_id: str          # stable hash
    constraints: List[str]     # normalized strings
    polarity: str              # "forbids" | "inevitable" | "delegitimizes"
    confidence: float
    evidence_ids: List[str]
