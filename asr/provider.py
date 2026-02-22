from __future__ import annotations

from abc import ABC, abstractmethod

from .types import ASRRequest, ASRResult


class ASRProvider(ABC):
    @abstractmethod
    def transcribe(self, req: ASRRequest) -> ASRResult:
        raise NotImplementedError
