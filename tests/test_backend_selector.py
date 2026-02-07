import pytest

from summit.inference.backend_selector import select_backend
from summit.inference.model_preflight import Preflight
from summit.policy.model_loading import ModelLoadingPolicy


@pytest.fixture
def vllm_supported():
    return {"DeepseekOCRForCausalLM", "LlamaForCausalLM"}

def test_select_vllm_native_allowlisted(vllm_supported):
    model_id = "deepseek-ai/DeepSeek-OCR"
    p = Preflight(
        model_id=model_id,
        architectures=["DeepseekOCRForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(
        allow_remote_code=True,
        remote_code_allowlist={model_id}
    )
    assert select_backend(p, policy, vllm_supported) == "vllm_native"

def test_select_vllm_native_blocked_without_policy(vllm_supported):
    model_id = "deepseek-ai/DeepSeek-OCR"
    p = Preflight(
        model_id=model_id,
        architectures=["DeepseekOCRForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(allow_remote_code=False)
    # Even if native in vLLM, if it requires remote code it must be allowlisted
    assert select_backend(p, policy, vllm_supported) == "blocked"

def test_select_blocked_ocr2(vllm_supported):
    p = Preflight(
        model_id="deepseek-ai/DeepSeek-OCR-2",
        architectures=["DeepseekOCR2ForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(allow_remote_code=False)
    assert select_backend(p, policy, vllm_supported) == "blocked"

def test_select_vllm_transformers_allowlisted(vllm_supported):
    model_id = "deepseek-ai/DeepSeek-OCR-2"
    p = Preflight(
        model_id=model_id,
        architectures=["DeepseekOCR2ForCausalLM"],
        requires_remote_code=True
    )
    policy = ModelLoadingPolicy(
        allow_remote_code=True,
        remote_code_allowlist={model_id}
    )
    assert select_backend(p, policy, vllm_supported) == "vllm_transformers"

def test_select_vllm_transformers_no_remote_code_required(vllm_supported):
    p = Preflight(
        model_id="some/standard-model",
        architectures=["UnknownArch"],
        requires_remote_code=False
    )
    policy = ModelLoadingPolicy(allow_remote_code=False)
    assert select_backend(p, policy, vllm_supported) == "vllm_transformers"
