import os
from typing import Dict


def repair_enabled() -> bool:
  return os.getenv("SUMMIT_REPAIR_ENABLE", "0") == "1"


def propose_patch(failing_output: str) -> Dict[str, object]:
  if not repair_enabled():
    return {"status": "disabled", "reason": "flag_off"}

  summary = "Repair proposal intentionally constrained to dry-run output."
  return {
    "status": "proposed",
    "summary": summary,
    "patch": "",
    "failing_signature": failing_output[:120],
    "evidence": ["evidence/index.json"],
  }
