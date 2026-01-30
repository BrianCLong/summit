from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass(frozen=True)
class AnchorCaption:
    text: str
    confidence: float = 1.0
    provider: str = "mock"
    warnings: tuple[str, ...] = ()

class CaptionProvider(Protocol):
    def caption(self, image_bytes: bytes) -> AnchorCaption: ...

class MockCaptionProvider:
    def caption(self, image_bytes: bytes) -> AnchorCaption:
        # Deterministic placeholder; replace with real MLLM provider in Lane2.
        return AnchorCaption(text="A photo shared online.", confidence=0.1, provider="mock")
