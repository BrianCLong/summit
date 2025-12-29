from __future__ import annotations

import hashlib
import json
from typing import Dict, Optional

from .interface import AgentMessage, TimingMixin


class BaseLLMBackend(TimingMixin):
    backend_name = "base"

    def __init__(self, golden_overrides: Optional[Dict[str, str]] = None) -> None:
        self.golden_overrides = golden_overrides or {}

    def generate(self, prompt: str, message: AgentMessage) -> str:
        normalized = message.content.strip().lower()
        if normalized in self.golden_overrides:
            return self.golden_overrides[normalized]

        # Deterministic but non-trivial stub generation so metrics are stable.
        signature = hashlib.sha256((self.backend_name + prompt).encode()).hexdigest()[:10]
        return f"[{self.backend_name}:{signature}] {message.content}"

    def __call__(self, prompt: str, message: AgentMessage) -> str:
        return self.generate(prompt, message)


class GrokBackend(BaseLLMBackend):
    backend_name = "grok"


class ClaudeBackend(BaseLLMBackend):
    backend_name = "claude"


class GeminiBackend(BaseLLMBackend):
    backend_name = "gemini"


class QwenBackend(BaseLLMBackend):
    backend_name = "qwen"


BACKEND_REGISTRY = {
    "grok": GrokBackend,
    "claude": ClaudeBackend,
    "gemini": GeminiBackend,
    "qwen": QwenBackend,
}


def backend_for(name: str, golden_overrides: Optional[Dict[str, str]] = None) -> BaseLLMBackend:
    key = name.lower()
    if key not in BACKEND_REGISTRY:
        raise ValueError(f"Unsupported backend '{name}'. Valid options: {sorted(BACKEND_REGISTRY)}")
    return BACKEND_REGISTRY[key](golden_overrides=golden_overrides)


class GoldenOverrideStore:
    """Adapts golden datasets into a lookup table for deterministic stubs."""

    def __init__(self) -> None:
        self._store: Dict[str, str] = {}

    def add(self, input_text: str, expected: str) -> None:
        if input_text is None:
            return
        normalized = input_text.strip().lower()
        if not normalized:
            return
        self._store[normalized] = expected

    @classmethod
    def from_records(cls, records) -> "GoldenOverrideStore":
        store = cls()
        for record in records:
            if isinstance(record, dict):
                content = record.get("input") or record.get("state")
                expected = record.get("expected_output")
                if content and expected:
                    store.add(content, expected)
        return store

    def as_dict(self) -> Dict[str, str]:
        return dict(self._store)

    def to_json(self) -> str:
        return json.dumps(self._store, indent=2)
