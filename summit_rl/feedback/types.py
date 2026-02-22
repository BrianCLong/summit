from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

FeedbackKind = Literal["scalar", "text", "tool_trace", "unit_test", "runtime_error", "judge"]

@dataclass(frozen=True)
class RichFeedback:
    kind: FeedbackKind
    text: str
    meta: dict[str, Any]
    provenance: dict[str, Any]  # e.g., tool name, judge model, runtime, version
    redactions: Optional[list[dict[str, Any]]] = None
