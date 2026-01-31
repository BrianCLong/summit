from __future__ import annotations
from typing import List, Literal, Set
from summit.policy.model_loading import ModelLoadingPolicy
from summit.inference.model_preflight import Preflight

Backend = Literal["vllm_native", "vllm_transformers", "hf_transformers", "blocked"]

def select_backend(p: Preflight, policy: ModelLoadingPolicy, vllm_supported_arches: Set[str]) -> Backend:
    """
    Selects the best inference backend based on model preflight data and security policy.

    DeepSeek-OCR2 ('DeepseekOCR2ForCausalLM') is currently NOT in vLLM's native registry,
    so it must use 'vllm_transformers' (which requires trust_remote_code).
    """
    # vLLM-native path requires architecture to be in vLLM registry.
    if any(a in vllm_supported_arches for a in p.architectures):
        return "vllm_native"

    # If the model requires remote code (like OCR2 before it is upstreamed),
    # check the security policy.
    if p.requires_remote_code:
        if not policy.can_trust_remote_code(p.model_id):
            return "blocked"
        return "vllm_transformers"

    # Fallback for models that don't need remote code and aren't in vLLM registry
    return "vllm_transformers"
