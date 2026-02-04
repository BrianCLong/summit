# Qwen3-TTS Integration

## Overview
Summit provides a first-class integration for **Qwen3-TTS**, supporting text-to-speech (TTS), voice design, and voice cloning.

## Components
- **Adapter**: `summit.audio.tts.qwen3.adapter.Qwen3TTSAdapter`
- **Voice Artifacts**: `summit.audio.voice.schema.VoiceArtifact`
- **Cache Policy**: `summit.audio.model_cache_policy.ModelCachePolicy`
- **Downloader**: `summit.audio.model_downloader.Qwen3ModelDownloader`

## Feature Flags
- `FEATURE_QWEN3_TTS`: Global kill-switch (Default: `OFF`)
- `FEATURE_QWEN3_TTS_VOICE_CLONE`: Enables voice cloning (Default: `OFF`)
- `FEATURE_QWEN3_TTS_AUTO_DOWNLOAD`: Enables automatic model acquisition (Default: `OFF`)

## Usage

### Text-to-Speech
```python
from summit.audio.tts.qwen3.adapter import Qwen3TTSAdapter, Qwen3TTSRequest

adapter = Qwen3TTSAdapter(enabled=True)
req = Qwen3TTSRequest(text="Hello world", device="cuda")
res = adapter.synthesize(req)
```

### Voice Cloning (requires consent)
```python
from summit.audio.voice.consent import require_consent

require_consent("I_HAVE_RIGHTS_ATTESTATION_V1")
# ... proceed with cloning ...
```

## Model Caching
Models are cached in a canonical location: `<ROOT>/tts/qwen3/<MODEL_NAME>/`.
The policy ensures no stray folders are created elsewhere.

## Attention Backends
Exposed via `attention_backend` parameter:
- `auto` (Default)
- `flash`
- `sdpa`
- `eager`
- `sage`
