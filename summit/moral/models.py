from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Optional

SubjectType = Literal["actor", "segment", "concept"]

@dataclass(frozen=True)
class MoralProfile:
    subject_id: str
    subject_type: SubjectType
    vector: dict[str, float]          # normalized moral foundations distribution
    confidence: float                 # 0..1
    provenance: dict[str, str]        # e.g., {"method":"MAG_DIFFUSE", "lexicon":"MFD2.0"}
    purpose_tag: str                  # required (policy gate)
