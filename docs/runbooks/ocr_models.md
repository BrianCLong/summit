# Runbook: Serving OCR Models (DeepSeek-OCR)

## Overview
This runbook covers how to deploy and troubleshoot OCR models, specifically DeepSeek-OCR v1 and v2, within the Summit platform.

## Model Preflight
Summit uses a preflight check to determine if a model is supported by the native vLLM engine.
- **DeepSeek-OCR v1**: Supported natively.
- **DeepSeek-OCR-2**: Currently requires `trust_remote_code=True` and is routed via `vllm_transformers` or blocked by policy.

## Policy Guardrails
Summit denies `trust_remote_code` by default for security.
To enable it for a specific model:
1. Update `summit/policy/model_loading.py` or the runtime policy configuration.
2. Add the model ID to the `remote_code_allowlist`.

## Troubleshooting "Unsupported Model Architecture"
If you see an error about `DeepseekOCR2ForCausalLM` not being supported by vLLM:
- **Solution 1 (Recommended)**: Use `deepseek-ai/DeepSeek-OCR` (v1) which is natively supported.
- **Solution 2**: Opt-in to the Transformers modeling backend by allowlisting the model ID and enabling remote code.

## Deployment
Use the provided docker-compose examples in `deploy/examples/vllm-deepseek-ocr-v1.compose.yml`.
Ensure image tags are pinned (avoid `:latest`).
