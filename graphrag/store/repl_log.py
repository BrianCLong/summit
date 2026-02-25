from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class ReplEvent:
  event_id: str        # deterministic hash of payload
  region: str
  payload: dict[str, Any]

class ReplLog:
  def __init__(self) -> None:
    self._events: list[ReplEvent] = []
  def append(self, ev: ReplEvent) -> None:
    self._events.append(ev)
  def all(self) -> list[ReplEvent]:
    return list(self._events)
