import os
from typing import Dict


def automations_enabled() -> bool:
  return os.getenv("SUMMIT_AUTOMATIONS_ENABLE", "0") == "1"


def run(workflow_id: str, payload: dict[str, object]) -> dict[str, object]:
  if not automations_enabled():
    return {"status": "disabled", "reason": "flag_off"}

  return {
    "status": "queued",
    "workflow_id": workflow_id,
    "payload_keys": sorted(payload.keys()),
    "policy": "deny-by-default",
  }
