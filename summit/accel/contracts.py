from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

Modality = Literal["t2i", "t2v", "i2v", "v2v"]


@dataclass(frozen=True)
class AccelMethodSpec:
    method_id: str
    family: str
    modality: Modality
    steps: int
    teacher_lineage: Optional[str] = None
    student_lineage: Optional[str] = None
    recipe_id: Optional[str] = None


@dataclass
class AccelRunResult:
    outputs_uri: str
    metrics: Dict[str, Any]
    evidence_id: str
