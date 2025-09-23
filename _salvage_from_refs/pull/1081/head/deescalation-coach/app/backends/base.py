"""Abstract interface for rewrite backends."""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseRewriteBackend(ABC):
    @abstractmethod
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        raise NotImplementedError
