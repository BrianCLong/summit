"""
Clean-room adapter stub for Qwen3-ASR models.
Implements the Summit ASRProvider interface; runtime integration is gated.
"""
from __future__ import annotations

from ._util import deny_if_disabled
from ..provider import ASRProvider
from ..types import ASRRequest, ASRResult, ASRSegment


class Qwen3ASRProvider(ASRProvider):
    def __init__(self, *, backend: str = "transformers") -> None:
        self.backend = backend

    def transcribe(self, req: ASRRequest) -> ASRResult:
        deny_if_disabled("SUMMIT_ASR_ENABLED")
        raise NotImplementedError("Qwen3ASRProvider not yet wired (clean-room stub).")
