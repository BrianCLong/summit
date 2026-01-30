import time
from dataclasses import dataclass
from enum import Enum


class State(str, Enum):
  CLOSED = "closed"
  OPEN = "open"
  HALF_OPEN = "half_open"

@dataclass(frozen=True)
class BreakerConfig:
  window_size: int = 50
  error_rate_to_open: float = 0.5
  open_seconds: int = 30
  half_open_trials: int = 3

class CircuitBreaker:
  def __init__(self, cfg: BreakerConfig):
    self.cfg = cfg
    self.state = State.CLOSED
    self._opened_at = 0.0
    self._events = []  # list[bool] True=success False=failure
    self._half_open_attempts = 0

  def _error_rate(self) -> float:
    if not self._events:
      return 0.0
    fails = sum(1 for e in self._events if not e)
    return fails / len(self._events)

  def allow(self) -> bool:
    if self.state == State.OPEN:
      if time.time() - self._opened_at >= self.cfg.open_seconds:
        self.state = State.HALF_OPEN
        self._half_open_attempts = 0
        return True
      return False
    if self.state == State.HALF_OPEN:
      return self._half_open_attempts < self.cfg.half_open_trials
    return True

  def record(self, success: bool) -> None:
    if self.state == State.HALF_OPEN:
      self._half_open_attempts += 1
      if success:
        # Close after first success (conservative); can tune later.
        self.state = State.CLOSED
        self._events.clear()
        return
      self._trip_open()
      return

    self._events.append(success)
    self._events = self._events[-self.cfg.window_size:]
    if self._error_rate() >= self.cfg.error_rate_to_open and len(self._events) == self.cfg.window_size:
      self._trip_open()

  def _trip_open(self) -> None:
    self.state = State.OPEN
    self._opened_at = time.time()
