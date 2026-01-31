# Runbook: Managing OCR Models in Summit

This runbook covers how to deploy and troubleshoot OCR models, specifically DeepSeek-OCR variants.

## Model Preflight

Before serving a model, run the preflight check to determine if the architecture is supported natively by vLLM.

```python
from summit.inference.model_preflight import perform_preflight
preflight = perform_preflight("deepseek-ai/DeepSeek-OCR-2")
print(preflight.architectures)
```

## Troubleshooting "Unsupported Architecture"

If you see `UnsupportedModelArchitectureError` (or similar vLLM error):

1. **Check Backend Selector**: Ensure Summit is correctly routing to `vllm_transformers`.
2. **Policy Review**: Ensure the model is allowlisted in `summit/policy/model_loading.py` if it requires `trust_remote_code`.
3. **Fallback**: If OCR-2 is problematic, consider falling back to DeepSeek-OCR v1 which has native vLLM support.

## Security Gates

- **No Latest Tags**: Ensure all deployment manifests use pinned image tags.
- **Dependency Delta**: Track any new dependencies in `deps/dep_delta.md`.
