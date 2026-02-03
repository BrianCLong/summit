import hashlib
import os
from typing import Dict, List


def scaffold_enabled() -> bool:
  return os.getenv("SUMMIT_SCAFFOLD_ENABLE", "0") == "1"


def generate_from_prompt(prompt: str) -> Dict[str, object]:
  if not scaffold_enabled():
    return {"status": "disabled", "reason": "flag_off"}

  files: List[str] = [
    "README.md",
    "src/main.py",
    "src/__init__.py",
  ]
  return {
    "status": "ok",
    "selected_template": "summit-minimal",
    "files": files,
    "prompt_hash": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
  }
