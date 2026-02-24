from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class PolicyConfig:
    allowlist_path: Path = Path("security/targets.allowlist.json")
    attestation_path: Path = Path("security/authorization.attestation.md")

class PolicyError(Exception): ...

def require_authorization(cfg: PolicyConfig, live: bool) -> None:
    """
    Deny-by-default:
      - If live == True, require allowlist + attestation present.
      - CI will run only in dry-run (live=False).
    """
    if not live:
        return
    if not cfg.allowlist_path.exists():
        raise PolicyError(f"Missing allowlist: {cfg.allowlist_path}")
    if not cfg.attestation_path.exists():
        raise PolicyError(f"Missing attestation: {cfg.attestation_path}")
    # Basic sanity: allowlist must parse and contain at least one entry
    try:
        data = json.loads(cfg.allowlist_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise PolicyError(f"Invalid JSON in allowlist: {e}")

    if not data.get("targets"):
        raise PolicyError("Allowlist has no targets")
