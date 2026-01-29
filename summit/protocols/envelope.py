from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Intent = Literal["REQUEST", "INFORM", "DELEGATE", "RESULT", "ERROR"]

@dataclass(frozen=True)
class ToolCall:
  name: str
  arguments: Dict[str, Any]

@dataclass(frozen=True)
class SummitEnvelope:
  message_id: str
  conversation_id: str
  sender: str
  recipient: str
  intent: Intent
  text: str = ""
  tool_calls: List[ToolCall] = field(default_factory=list)
  explanations: List[str] = field(default_factory=list)
  security: Dict[str, Any] = field(default_factory=dict)
