from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class DetectorEvent:
    event_id: str              # stable hash
    detector: str              # e.g., "constraint_signature"
    score: float
    threshold: float
    window: dict[str, str]     # {"start": "...", "end": "..."} - optional strings
    evidence_ids: list[str]
    metadata: dict[str, str]

@dataclass(frozen=True)
class ConstraintSignature:
    signature_id: str          # stable hash
    constraints: list[str]     # normalized strings
    polarity: str              # "forbids" | "inevitable" | "delegitimizes"
    confidence: float
    evidence_ids: list[str]
