from dataclasses import dataclass
from typing import Literal, Dict, Any, Optional

@dataclass
class PsychographicSignal:
    subject_scope: Literal["document", "cohort", "community"]
    signal_type: Literal["moral_foundations", "emotional_climate", "personality_proxy"]
    value: Dict[str, Any]
    uncertainty: Dict[str, Any]
    provenance: Dict[str, Any]
    policy: Dict[str, Any]
    pii_status: bool = False # Confirmed scrubbed

    def validate(self):
        if self.subject_scope == "person":
             raise ValueError("Person scope is not allowed in PsychographicSignal")
        # Further validation logic if needed
