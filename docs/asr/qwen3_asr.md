# Qwen3-ASR Integration

This document describes the integration of the `Qwen3-ASR-0.6B` model into the Summit platform.

## Overview

The Qwen3-ASR integration provides a unified interface for Automatic Speech Recognition (ASR) supporting 52 languages and dialects. It features both offline and streaming inference capabilities and supports "promptable ASR" via a secure context policy.

## Architecture

The module is located at `summit/audio/asr/` and follows the standard Summit provider pattern:

- `provider.py`: Base abstract class for ASR providers.
- `types.py`: Data contracts (Request/Result).
- `providers/qwen3_asr_provider.py`: Implementation for Qwen3-ASR supporting Transformers and vLLM backends.
- `policy/context_policy.py`: Security gate for textual context.

## Enablement

By default, the ASR module is disabled. To enable it, use the following environment variables or feature flags:

- `FEATURE_QWEN3_ASR=1`: Enable the main ASR feature.
- `SUMMIT_ASR_ENABLED=1`: Alternative environment variable to enable ASR.
- `ASR_CLI_ENABLED=1`: Enable the CLI tool.
- `ASR_CONTEXT_ENABLED=1`: Enable the promptable context feature (requires security audit).

## Security & Privacy

- **Redaction**: Audio data and context are never logged in plaintext. The `redact_for_logs` utility ensures sensitive fields are masked.
- **Context Policy**: A dedicated policy engine validates promptable context for PII (emails, SSNs, IPs) and enforces length limits.
- **Deny-by-Default**: All external integrations and advanced features require explicit opt-in.

## Usage

### CLI

```bash
ASR_CLI_ENABLED=1 FEATURE_QWEN3_ASR=1 python3 -m summit.audio.asr.cli \
    --audio "path/to/audio.wav" \
    --audio-type "path" \
    --language "en" \
    --timestamps
```

### Python API

```python
from summit.audio.asr.providers.qwen3_asr_provider import Qwen3ASRProvider
from summit.audio.asr.types import ASRRequest

provider = Qwen3ASRProvider(backend="transformers")
request = ASRRequest(audio="...", audio_type="base64")
result = provider.transcribe(request)
print(result.text)
```

## Backends

1. **Transformers**: Standard compatibility backend using the `qwen-asr` package.
2. **vLLM**: High-throughput backend recommended for production streaming and batch workloads.
