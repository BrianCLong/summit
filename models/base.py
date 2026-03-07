from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class ModelOutput:
    text: str
    tokens_used: int
    latency_ms: float
    metadata: dict[str, Any]

class BaseModelAdapter(ABC):
    MODEL_ID: str

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> ModelOutput:
        """
        Generates text based on the prompt.
        """
        pass
