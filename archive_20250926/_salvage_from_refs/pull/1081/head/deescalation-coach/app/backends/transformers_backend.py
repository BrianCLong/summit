"""Stub transformers backend for tests."""

from __future__ import annotations

from .base import BaseRewriteBackend


class TransformersBackend(BaseRewriteBackend):
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        # For tests we simply echo the prompt as "generation"
        return prompt
