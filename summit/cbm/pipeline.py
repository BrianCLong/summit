import hashlib
import json
from dataclasses import dataclass
from typing import Iterable, Dict, Any

from summit.cbm.narratives import build_narrative_graph, write_narrative_artifacts
from summit.cbm.coordination import detect_coordination, write_influence_artifacts
from summit.cbm.ai_exposure import map_ai_exposure, write_exposure_artifacts
from summit.cbm.void_score import calculate_void_score, write_void_artifacts

@dataclass(frozen=True)
class CBMConfig:
    enabled: bool = False
    llm_probe_enabled: bool = False
    hybrid_correlation_enabled: bool = False

def run_cbm(events: Iterable[Dict[str, Any]], cfg: CBMConfig) -> Dict[str, Any]:
    if not cfg.enabled:
        return {"status": "disabled", "artifacts": {}}

    events_list = list(events)
    # Deterministic hash of inputs
    run_hash = hashlib.sha256(json.dumps(events_list, sort_keys=True).encode()).hexdigest()[:8]

    # 1. Narratives
    narratives = build_narrative_graph(events_list)
    write_narrative_artifacts(narratives, "artifacts/cbm/narratives.json")

    # 2. Influence
    influence = detect_coordination(events_list)
    write_influence_artifacts(influence, "artifacts/cbm/influence_graph.json")

    # 3. AI Exposure
    if cfg.llm_probe_enabled:
        prompts = [{"text": e.get("text", "probe")} for e in events_list]
        if not prompts:
            prompts = [{"text": "default probe"}]
        exposure = map_ai_exposure(prompts)
        write_exposure_artifacts(exposure, "artifacts/cbm/ai_exposure.json")

    # 4. Void Score
    void_scores = [calculate_void_score("general", "en-US", 0.5)]
    write_void_artifacts(void_scores, "artifacts/cbm/data_void_risk.json")

    stamp = {
        "run_hash": run_hash,
        "event_count": len(events_list),
        "config": {
            "enabled": cfg.enabled,
            "llm_probe_enabled": cfg.llm_probe_enabled,
            "hybrid_correlation_enabled": cfg.hybrid_correlation_enabled
        }
    }

    with open("artifacts/cbm/stamp.json", "w") as f:
        json.dump(stamp, f, sort_keys=True, indent=2)

    return {"status": "ok", "artifacts": {"cbm/stamp.json": stamp}}
