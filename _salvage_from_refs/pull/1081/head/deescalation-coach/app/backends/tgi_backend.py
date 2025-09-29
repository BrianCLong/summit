"""Skeleton Text-Generation-Inference backend."""

from __future__ import annotations

from .base import BaseRewriteBackend


class TGIBackend(BaseRewriteBackend):
    def __init__(self, url: str = "http://localhost:8080") -> None:
        self.url = url

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        raise NotImplementedError("TGI backend not implemented")
