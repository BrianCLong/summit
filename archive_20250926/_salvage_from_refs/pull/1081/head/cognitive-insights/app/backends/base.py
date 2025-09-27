from __future__ import annotations

from typing import TypedDict


class NLPResult(TypedDict):
    language: str
    sentiment: dict[str, float]
    emotion: dict[str, float]
    toxicity: dict[str, float]
    cues: dict[str, float]


class BaseNLPBackend:
    """Interface for NLP backends."""

    def warmup(self) -> None:  # pragma: no cover - interface
        pass

    def predict(
        self, texts: list[str], lang: str | None
    ) -> list[NLPResult]:  # pragma: no cover - interface
        raise NotImplementedError
