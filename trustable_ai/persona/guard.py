import time
import os

class RefractoryGuard:
  def __init__(self, refractory_ms: int):
    self.refractory_ms = refractory_ms
    self._last_emit_ms = 0

  def allow(self) -> bool:
    if os.environ.get("TRUST_PERSONA_ENABLED", "0") != "1":
       return True

    now_ms = int(time.time() * 1000)
    if now_ms - self._last_emit_ms < self.refractory_ms:
      return False
    self._last_emit_ms = now_ms
    return True
