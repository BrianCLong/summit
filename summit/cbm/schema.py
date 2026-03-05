from dataclasses import dataclass
from typing import List, Dict, Optional, Any

@dataclass(frozen=True)
class EvidenceRef:
    evid: str
    source_ids: List[str]

@dataclass(frozen=True)
class NarrativeCluster:
    id: str
    title: str
    variants: List[str]
    locale: Optional[str]
    evidence: List[EvidenceRef]

@dataclass(frozen=True)
class InfluenceCell:
    id: str
    description: str

@dataclass(frozen=True)
class AudienceSegment:
    id: str
    description: str

@dataclass(frozen=True)
class BeliefDelta:
    segment_id: str
    narrative_id: str
    delta: float

@dataclass(frozen=True)
class AIExposure:
    id: str
    narrative_id: str

@dataclass(frozen=True)
class ChokePoint:
    id: str
    description: str

@dataclass(frozen=True)
class Surface:
    id: str
    type: str
