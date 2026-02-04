from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional


@dataclass
class PsychographicSignal:
    subject_scope: Literal["document", "cohort", "community"]
    signal_type: Literal["moral_foundations", "emotional_climate", "personality_proxy"]
    value: dict[str, Any]
    uncertainty: dict[str, Any]
    provenance: dict[str, Any]
    policy: dict[str, Any]
    pii_status: bool = False # Confirmed scrubbed

    def validate(self):
        if self.subject_scope == "person":
             raise ValueError("Person scope is not allowed in PsychographicSignal")
        # Further validation logic if needed
