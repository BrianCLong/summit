from typing import List
from summit.input.types import IntentFrame

class BaselineDecoder:
    def decode(self, raw_features: List[float]) -> IntentFrame:
        # Stub for micro-movement decoding
        return IntentFrame(
            intent_class="command_decode",
            text="stop",
            confidence=0.92,
            meta={}
        )
