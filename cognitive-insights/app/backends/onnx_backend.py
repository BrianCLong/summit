from __future__ import annotations

from typing import List

from .base import BaseNLPBackend, NLPResult


class ONNXRuntimeBackend(BaseNLPBackend):
    """Placeholder backend using ONNXRuntime models."""

    def warmup(self) -> None:  # pragma: no cover - not implemented
        pass

    def predict(self, texts: List[str], lang: str | None) -> List[NLPResult]:  # pragma: no cover - stub
        raise NotImplementedError("ONNX backend not implemented")
