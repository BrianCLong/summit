"""ONNX backend placeholder."""

from __future__ import annotations

from .base import BaseRewriteBackend


class ONNXBackend(BaseRewriteBackend):
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        raise NotImplementedError("ONNX backend not implemented")
