from __future__ import annotations
from typing import List, Literal, Set
from summit.policy.model_loading import ModelLoadingPolicy
from summit.inference.model_preflight import Preflight

Backend = Literal["vllm_native", "vllm_transformers", "hf_transformers", "blocked"]

def select_backend(p: Preflight, policy: ModelLoadingPolicy, vllm_supported_arches: Set[str]) -> Backend:
    """
    Select the best inference backend based on model preflight and policy.
    """
    # Remote code requirement is ALWAYS policy-guarded, even for vLLM native models.
    if p.requires_remote_code and not policy.can_trust_remote_code(p.model_id):
        return "blocked"

    # vLLM-native path requires architecture to be in vLLM registry.
    if any(a in vllm_supported_arches for a in p.architectures):
        return "vllm_native"

    return "vllm_transformers"

def get_remediation(p: Preflight, backend: Backend) -> str:
    """
    Provide actionable remediation text for blocked models.
    """
    if backend != "blocked":
        return ""

    remediation = [
        f"Model '{p.model_id}' is blocked by policy.",
        f"Architectures: {', '.join(p.architectures)}"
    ]

    if p.requires_remote_code:
        remediation.append("Reason: Model requires 'trust_remote_code=True' which is disabled by default.")
        remediation.append("Remediation: Allowlist this model ID or use a supported alternative like 'deepseek-ai/DeepSeek-OCR'.")

    return " ".join(remediation)
