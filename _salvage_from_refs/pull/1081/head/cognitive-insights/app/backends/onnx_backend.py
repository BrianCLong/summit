from __future__ import annotations

from .base import BaseNLPBackend, NLPResult


class ONNXRuntimeBackend(BaseNLPBackend):
    """Placeholder backend using ONNXRuntime models."""

    def warmup(self) -> None:  # pragma: no cover - not implemented
        pass

    def predict(
        self, texts: list[str], lang: str | None
    ) -> list[NLPResult]:  # pragma: no cover - stub
        raise NotImplementedError("ONNX backend not implemented")
