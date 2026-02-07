from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Preflight:
    model_id: str
    architectures: list[str]
    requires_remote_code: bool
    license: Optional[str] = None

def preflight_model(model_id: str) -> Preflight:
    """
    Preflight model metadata to determine architecture and remote code requirements.
    In a real implementation, this would load the config from HF Hub or local cache.
    """
    # Deterministic mapping for DeepSeek-OCR models
    if "deepseek-ocr-2" in model_id.lower():
        return Preflight(
            model_id=model_id,
            architectures=["DeepseekOCR2ForCausalLM"],
            requires_remote_code=True,
            license="Apache-2.0"
        )
    elif "deepseek-ocr" in model_id.lower():
        return Preflight(
            model_id=model_id,
            architectures=["DeepseekOCRForCausalLM"],
            requires_remote_code=True,
            license="Apache-2.0"
        )

    # Fallback for other models
    return Preflight(
        model_id=model_id,
        architectures=[],
        requires_remote_code=False
    )
