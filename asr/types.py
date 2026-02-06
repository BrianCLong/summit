from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional

AudioInputType = Literal["path", "url", "base64", "ndarray"]


@dataclass(frozen=True)
class ASRRequest:
    audio: str
    audio_type: AudioInputType
    language: Optional[str] = None
    return_timestamps: bool = False
    context: Optional[str] = None


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
