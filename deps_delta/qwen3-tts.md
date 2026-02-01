# Dependency Delta: Qwen3-TTS Integration

## Added Dependencies (Planned)
- `torch`: For model inference.
- `transformers`: For model loading and tokenization.
- `diffusers`: Often required for some components of advanced TTS.
- `librosa`: For audio processing.

## Rationale
Integrating Qwen3-TTS requires standard deep learning and audio processing libraries.
We follow a clean-room implementation using Apache-2.0 upstream code.

## License Check
- [x] All new dependencies have compatible licenses (Apache-2.0, MIT, BSD).
