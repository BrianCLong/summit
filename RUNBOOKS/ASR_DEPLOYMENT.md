# Runbook: ASR Deployment (Qwen3-ASR)

This runbook describes the steps to deploy and maintain the Qwen3-ASR service.

## Prerequisites

- GPU with at least 8GB VRAM (for 0.6B model).
- Docker and NVIDIA Container Toolkit installed.
- Python 3.11+.

## Deployment Steps

### 1. Model Preparation

The model `Qwen/Qwen3-ASR-0.6B` is hosted on Hugging Face. Ensure the environment has access to download the weights.

```bash
export HUGGING_FACE_HUB_TOKEN=<your_token>
```

### 2. Backend Selection

For production, use the vLLM backend:

```bash
export ASR_BACKEND=vllm
```

### 3. Environment Variables

Set the following variables in your `.env` or deployment manifest:

```env
FEATURE_QWEN3_ASR=1
ASR_CLI_ENABLED=1
# Optional: enable forced aligner for better timestamps
ASR_TIMESTAMPS=1
```

### 4. Verification

Run the smoke test to ensure the provider is correctly wired:

```bash
SUMMIT_ASR_ENABLED=1 python3 -m pytest tests/test_asr_contract.py
```

## Monitoring

- **Latency**: Monitor `asr_inference_latency_ms`.
- **Throughput**: Track `asr_requests_per_second`.
- **Errors**: Watch for `RuntimeError` (disabled) or `ValueError` (policy violation).

## Troubleshooting

### "Disabled by default" error
Ensure `FEATURE_QWEN3_ASR=1` or `SUMMIT_ASR_ENABLED=1` is set.

### "Context contains sensitive information"
The `context` field triggered the security policy. Check the input for PII or secrets.

### Out of Memory (OOM)
If using the Transformers backend, ensure `attention_backend="flash"` or `sdpa` is used on compatible hardware to reduce memory footprint.
