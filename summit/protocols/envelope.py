from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Intent = Literal["REQUEST", "INFORM", "DELEGATE", "RESULT", "ERROR"]

@dataclass(frozen=True)
class ToolCall:
  name: str
  arguments: dict[str, Any]

@dataclass(frozen=True)
class SummitEnvelope:
  message_id: str
  conversation_id: str
  sender: str
  recipient: str
  intent: Intent
  text: str = ""
  tool_calls: list[ToolCall] = field(default_factory=list)
  explanations: list[str] = field(default_factory=list)
  security: dict[str, Any] = field(default_factory=dict)
