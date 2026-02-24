from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass(frozen=True)
class ReplEvent:
  event_id: str        # deterministic hash of payload
  region: str
  payload: Dict[str, Any]

class ReplLog:
  def __init__(self) -> None:
    self._events: List[ReplEvent] = []
  def append(self, ev: ReplEvent) -> None:
    self._events.append(ev)
  def all(self) -> List[ReplEvent]:
    return list(self._events)
