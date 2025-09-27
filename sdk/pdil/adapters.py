"""Model endpoint adapters for PDIL."""

from __future__ import annotations

import abc
import hashlib
import json
import random
from typing import Dict, Optional


class ModelAdapter(abc.ABC):
    """Interface for model provider integrations."""

    name: str
    supports_seed_control: bool = True

    def __init__(self, name: str) -> None:
        self.name = name

    @abc.abstractmethod
    def generate(self, prompt: str, seed: Optional[int] = None, **kwargs: object) -> str:
        """Return a response for the prompt."""


class EchoAdapter(ModelAdapter):
    """Basic adapter that echoes prompts with deterministic noise for tests."""

    def __init__(self) -> None:
        super().__init__("echo")

    def generate(self, prompt: str, seed: Optional[int] = None, **kwargs: object) -> str:
        seed_value = seed if seed is not None else 0
        token = hashlib.sha1(prompt.encode("utf-8")).hexdigest()[:8]
        return f"{prompt.strip()} ::{seed_value}:{token}::"


class TemplateAdapter(ModelAdapter):
    """Adapter that simulates templated completions with seeded sampling."""

    def __init__(self, templates: Optional[Dict[str, str]] = None) -> None:
        super().__init__("template")
        self.templates = templates or {}

    def generate(self, prompt: str, seed: Optional[int] = None, **kwargs: object) -> str:
        seed_value = seed if seed is not None else 0
        rng = random.Random(seed_value + hash(prompt))
        base = self.templates.get(prompt, prompt)
        variants = base.split("|")
        choice = variants[rng.randrange(len(variants))]
        payload = {"seed": seed_value, "selected": choice.strip()}
        return json.dumps(payload, sort_keys=True)
