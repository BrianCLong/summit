from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class ModelOutput:
    """Standardized output from a model adapter."""
    text: str
    raw_response: dict[str, Any]
    usage: dict[str, int]
    metadata: Optional[dict[str, Any]] = None


class BaseModelAdapter(abc.ABC):
    """Base class for all model adapters in Summit."""

    MODEL_ID: str = "base-adapter"

    @abc.abstractmethod
    def generate(self, prompt: str, **kwargs: Any) -> ModelOutput:
        """Generates a completion for the given prompt."""
        pass

    async def generate_async(self, prompt: str, **kwargs: Any) -> ModelOutput:
        """Asynchronous generation (optional override)."""
        # Default implementation just calls the synchronous version
        return self.generate(prompt, **kwargs)
