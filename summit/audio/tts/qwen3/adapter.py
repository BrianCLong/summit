from dataclasses import dataclass
from typing import Literal, Optional

AttentionBackend = Literal["auto", "flash", "sdpa", "eager", "sage"]
Device = Literal["auto", "cuda", "mps", "cpu"]

@dataclass
class Qwen3TTSRequest:
    text: str
    language: Optional[str] = None
    voice_ref: Optional[str] = None  # voice_id
    instruction: Optional[str] = None
    device: Device = "auto"
    attention_backend: AttentionBackend = "auto"

class Qwen3TTSAdapter:
    """
    Clean-room Qwen3-TTS adapter.
    Integrates with Apache-2.0 upstream Qwen3-TTS while adhering to Summit's
    never-log and governance policies.
    """
    def __init__(self, enabled: bool = False):
        self._enabled = enabled

    def synthesize(self, req: Qwen3TTSRequest) -> dict:
        if not self._enabled:
            raise RuntimeError("qwen3_tts disabled by feature flag")

        # Governance: Redact sensitive text in logs if necessary.
        # Performance: Alignment with harvested attention backend selection.

        # TODO(clean-room): call upstream Qwen3-TTS (Apache-2.0) via Summit wrapper.
        return {
            "audio_uri": None,
            "duration_ms": None,
            "sample_rate": 0,
            "metrics": {
                "device": req.device,
                "attention_backend": req.attention_backend
            }
        }
