from dataclasses import dataclass
from typing import Literal, Optional, Dict, Any

IntentClass = Literal["command_decode", "identity_inference", "emotion_inference", "physiology_inference"]

@dataclass(frozen=True)
class IntentFrame:
    intent_class: IntentClass
    text: Optional[str]          # decoded token/command; None if not applicable
    confidence: float            # 0..1
    meta: Dict[str, Any]         # must exclude raw biometrics per policy
