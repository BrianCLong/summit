"""
Qwen3-ASR Provider with vLLM and Transformers backend support.
Gated by FEATURE_QWEN3_ASR and ASR_BACKEND.
"""
from __future__ import annotations

import os
import summit.flags
from ._util import deny_if_disabled
from ..provider import ASRProvider
from ..types import ASRRequest, ASRResult, ASRSegment
from ..policy.context_policy import validate_context

class Qwen3ASRProvider(ASRProvider):
    def __init__(self, *, backend: str = "transformers") -> None:
        self.backend = os.getenv("ASR_BACKEND", backend)

    def transcribe(self, req: ASRRequest) -> ASRResult:
        # Check if enabled via environment or feature flag
        if os.getenv("SUMMIT_ASR_ENABLED", "0") != "1" and not summit.flags.FEATURE_QWEN3_ASR:
            raise RuntimeError("Qwen3ASRProvider disabled: set SUMMIT_ASR_ENABLED=1 or FEATURE_QWEN3_ASR=1")

        validate_context(req.context)

        if self.backend == "vllm":
            return self._transcribe_vllm(req)
        elif self.backend == "transformers":
            return self._transcribe_transformers(req)
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")

    def _transcribe_vllm(self, req: ASRRequest) -> ASRResult:
        # vLLM integration logic goes here.
        if os.getenv("RUN_ASR_INTEGRATION", "0") != "1":
            # Mock for default CI
            start_ms = 0 if req.return_timestamps else None
            end_ms = 1000 if req.return_timestamps else None
            return ASRResult(
                language=req.language or "en",
                text="[vLLM Mock] " + req.audio,
                segments=[ASRSegment(start_ms=start_ms, end_ms=end_ms, text="[vLLM Mock] " + req.audio)]
            )
        raise NotImplementedError("Real vLLM integration requires GPU and vllm package.")

    def _transcribe_transformers(self, req: ASRRequest) -> ASRResult:
        # Transformers integration logic goes here.
        if os.getenv("RUN_ASR_INTEGRATION", "0") != "1":
            # Mock for default CI
            start_ms = 0 if req.return_timestamps else None
            end_ms = 1000 if req.return_timestamps else None
            return ASRResult(
                language=req.language or "en",
                text="[Transformers Mock] " + req.audio,
                segments=[ASRSegment(start_ms=start_ms, end_ms=end_ms, text="[Transformers Mock] " + req.audio)]
            )
        raise NotImplementedError("Real Transformers integration requires qwen-asr package.")
