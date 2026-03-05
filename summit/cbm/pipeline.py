from dataclasses import dataclass
from typing import Iterable, Dict, Any

@dataclass(frozen=True)
class CBMConfig:
    enabled: bool = False
    llm_probe_enabled: bool = False
    hybrid_correlation_enabled: bool = False

def run_cbm(events: Iterable[Dict[str, Any]], cfg: CBMConfig) -> Dict[str, Any]:
    if not cfg.enabled:
        return {"status": "disabled", "artifacts": {}}
    # TODO: normalize → extract → cluster → coordinate → score → emit
    return {"status": "ok", "artifacts": {"cbm/stamp.json": {"run_hash": "TODO"}}}
