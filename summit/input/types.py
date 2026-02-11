from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

IntentClass = Literal[
    "command_decode",
    "identity_inference",
    "emotion_inference",
    "physiology_inference",
]


@dataclass(frozen=True)
class IntentFrame:
    intent_class: IntentClass
    text: Optional[str]
    confidence: float
    meta: dict[str, Any]
