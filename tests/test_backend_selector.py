from __future__ import annotations
import pytest
from summit.inference.backend_selector import select_backend
from summit.inference.model_preflight import Preflight
from summit.policy.model_loading import ModelLoadingPolicy

@pytest.fixture
def vllm_supported_arches():
    return {"DeepseekOCRForCausalLM", "LlamaForCausalLM"}

def test_select_vllm_native(vllm_supported_arches):
    p = Preflight(
        model_id="deepseek-ai/DeepSeek-OCR",
        architectures=["DeepseekOCRForCausalLM"],
        requires_remote_code=False
    )
    policy = ModelLoadingPolicy()
    assert select_backend(p, policy, vllm_supported_arches) == "vllm_native"

def test_select_blocked_due_to_remote_code(vllm_supported_arches):
    p = Preflight(
        model_id="deepseek-ai/DeepSeek-OCR-2",
        architectures=["DeepseekOCR2ForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(allow_remote_code=False)
    assert select_backend(p, policy, vllm_supported_arches) == "blocked"

def test_select_vllm_transformers_allowlisted(vllm_supported_arches):
    p = Preflight(
        model_id="deepseek-ai/DeepSeek-OCR-2",
        architectures=["DeepseekOCR2ForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(
        allow_remote_code=True,
        remote_code_allowlist={"deepseek-ai/DeepSeek-OCR-2"}
    )
    assert select_backend(p, policy, vllm_supported_arches) == "vllm_transformers"

def test_select_blocked_not_allowlisted(vllm_supported_arches):
    p = Preflight(
        model_id="malicious/model",
        architectures=["DeepseekOCR2ForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(
        allow_remote_code=True,
        remote_code_allowlist={"deepseek-ai/DeepSeek-OCR-2"}
    )
    assert select_backend(p, policy, vllm_supported_arches) == "blocked"
