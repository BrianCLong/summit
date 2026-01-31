from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional

@dataclass(frozen=True)
class Preflight:
    model_id: str
    architectures: List[str]
    requires_remote_code: bool

def perform_preflight(model_id: str) -> Preflight:
    """
    Skeleton implementation of model preflight.
    In a real scenario, this would load the config.json from HF Hub or local cache.
    """
    # Hardcoded heuristics for known models in this task context
    if "DeepSeek-OCR-2" in model_id:
        return Preflight(
            model_id=model_id,
            architectures=["DeepseekOCR2ForCausalLM"],
            requires_remote_code=True
        )
    elif "DeepSeek-OCR" in model_id:
        return Preflight(
            model_id=model_id,
            architectures=["DeepseekOCRForCausalLM"],
            requires_remote_code=True
        )

    # Default placeholder
    return Preflight(
        model_id=model_id,
        architectures=[],
        requires_remote_code=False
    )
