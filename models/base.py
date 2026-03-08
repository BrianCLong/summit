from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ModelOutput:
    text: str
    tokens_used: int
    latency_ms: float
    metadata: Dict[str, Any]

class BaseModelAdapter(ABC):
    MODEL_ID: str

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> ModelOutput:
        """
        Generates text based on the prompt.
        """
        pass
