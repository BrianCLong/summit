from dataclasses import dataclass, field, asdict
from typing import Any, Dict, Optional
import time
from .redaction import Redactor

@dataclass
class StateSnapshot:
    agent_id: str
    step: str
    inputs: Dict[str, Any]
    internal_state: Dict[str, Any]
    confidence: float = 0.0
    timestamp: float = field(default_factory=time.time)

    def to_dict(self, redactor: Optional[Redactor] = None) -> Dict[str, Any]:
        d = asdict(self)
        if redactor:
            d["inputs"] = redactor.redact(d["inputs"])
            d["internal_state"] = redactor.redact(d["internal_state"])
        return d
