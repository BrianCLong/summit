from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional

AudioInputType = Literal["path", "url", "base64", "ndarray"]
AttentionBackend = Literal["auto", "flash", "sdpa", "eager", "sage"]
Device = Literal["auto", "cuda", "mps", "cpu"]


@dataclass(frozen=True)
class ASRRequest:
    audio: str
    audio_type: AudioInputType
    language: Optional[str] = None
    return_timestamps: bool = False
    context: Optional[str] = None
    device: Device = "auto"
    attention_backend: AttentionBackend = "auto"


@dataclass(frozen=True)
class ASRSegment:
    start_ms: Optional[int]
    end_ms: Optional[int]
    text: str


@dataclass(frozen=True)
class ASRResult:
    language: Optional[str]
    text: str
    segments: List[ASRSegment]
