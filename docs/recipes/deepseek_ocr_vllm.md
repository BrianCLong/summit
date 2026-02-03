# Recipe: DeepSeek-OCR v1 on vLLM

This recipe provides a known-good configuration for serving the DeepSeek-OCR v1 model using vLLM.

## Prerequisites
- NVIDIA GPU with 24GB+ VRAM (e.g., A10, L4, RTX 3090/4090)
- Docker and NVIDIA Container Toolkit installed

## Model Information
- **ID**: `deepseek-ai/DeepSeek-OCR`
- **Architecture**: `DeepseekOCRForCausalLM`
- **vLLM Support**: Native (officially supported since late 2025)

## Deployment
Use the following docker-compose snippet to launch the server:

```yaml
services:
  vllm-ocr:
    image: vllm/vllm-openai:v0.11.1
    command: >
      --model deepseek-ai/DeepSeek-OCR
      --trust-remote-code
      --gpu-memory-utilization 0.95
      --max-model-len 4096
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Policy Note
Summit requires that `deepseek-ai/DeepSeek-OCR` is added to the remote code allowlist even if vLLM supports it natively, as it still utilizes custom modeling code.
