# Design: DeepSeek-OCR2 Upstream Plan for vLLM

As of early 2025, `DeepseekOCR2ForCausalLM` is not natively supported in vLLM's architecture registry.

## Path to Support

### 1. Short-term: Transformers Backend
Use the `vllm_transformers` backend which uses the Hugging Face `Transformers` modeling code via `trust_remote_code=True`. This is currently what Summit routes to when a model is allowlisted.

### 2. Medium-term: Custom Model Registration
Implement a local vLLM model implementation that mirrors the DeepSeek-OCR2 architecture and register it via vLLM's `ModelRegistry`.

```python
from vllm import ModelRegistry
from .my_ocr2_impl import DeepseekOCR2ForCausalLM

ModelRegistry.register_model("DeepseekOCR2ForCausalLM", DeepseekOCR2ForCausalLM)
```

### 3. Long-term: Upstream Contribution
Submit a PR to vLLM to include `DeepseekOCR2ForCausalLM` in the core library, similar to how DeepSeek-OCR v1 was added.

## Security Considerations
- Require pinned revisions (`model_revision`) when using `trust_remote_code`.
- Maintain an allowlist of trusted model repositories.
