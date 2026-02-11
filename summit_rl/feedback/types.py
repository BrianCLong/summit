from dataclasses import dataclass
from typing import Literal, Optional, Dict, Any, List

FeedbackKind = Literal["scalar", "text", "tool_trace", "unit_test", "runtime_error", "judge"]

@dataclass(frozen=True)
class RichFeedback:
    kind: FeedbackKind
    text: str
    meta: Dict[str, Any]
    provenance: Dict[str, Any]  # e.g., tool name, judge model, runtime, version
    redactions: Optional[List[Dict[str, Any]]] = None
