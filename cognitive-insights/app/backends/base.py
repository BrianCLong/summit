from __future__ import annotations

from typing import Dict, List, TypedDict


class NLPResult(TypedDict):
    language: str
    sentiment: Dict[str, float]
    emotion: Dict[str, float]
    toxicity: Dict[str, float]
    cues: Dict[str, float]


class BaseNLPBackend:
    """Interface for NLP backends."""

    def warmup(self) -> None:  # pragma: no cover - interface
        pass

    def predict(self, texts: List[str], lang: str | None) -> List[NLPResult]:  # pragma: no cover - interface
        raise NotImplementedError
