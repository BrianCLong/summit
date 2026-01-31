# Recipe: Serving DeepSeek-OCR v1 with vLLM

DeepSeek-OCR v1 is officially supported in vLLM (architecture `DeepseekOCRForCausalLM`).

## Prerequisites

- NVIDIA GPU with 24GB+ VRAM (for FP16)
- vLLM >= 0.11.1

## Serving via OpenAI-Compatible API

```bash
python -m vllm.entrypoints.openai.api_server \
    --model deepseek-ai/DeepSeek-OCR \
    --trust-remote-code \
    --port 8000
```

## Deployment via Docker Compose

See `deploy/examples/vllm-deepseek-ocr-v1.compose.yml` for a production-ready container manifest.

## Notes on OCR2

For DeepSeek-OCR-2, please refer to the Summit backend selector logic as it currently requires the `vllm_transformers` backend until upstreamed.
