from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Literal
import os

try:
    from openai import OpenAI, AsyncOpenAI
except ImportError:
    OpenAI = None
    AsyncOpenAI = None

try:
    import anthropic
except ImportError:
    anthropic = None


ModelProvider = Literal["openai", "anthropic"]


@dataclass
class LLMConfig:
    provider: ModelProvider = "openai"
    model: str = "gpt-4"
    temperature: float = 0.2
    max_tokens: int = 4096


class LLM:
    def __init__(self, config: LLMConfig):
        self.config = config

        if config.provider == "openai":
            if AsyncOpenAI is None:
                raise ImportError("openai package not installed.")
            self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        elif config.provider == "anthropic":
            if anthropic is None:
                raise ImportError("anthropic package not installed.")
            self.client = anthropic.AsyncAnthropic(
                api_key=os.environ.get("ANTHROPIC_API_KEY")
            )

    async def call(self, prompt: str) -> str:
        """Unified interface to call either OpenAI or Anthropic."""
        cfg = self.config

        if cfg.provider == "openai":
            response = await self.client.chat.completions.create(
                model=cfg.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=cfg.temperature,
                max_tokens=cfg.max_tokens,
            )
            return response.choices[0].message.content

        elif cfg.provider == "anthropic":
            completion = await self.client.messages.create(
                model=cfg.model,
                max_tokens=cfg.max_tokens,
                temperature=cfg.temperature,
                messages=[{"role": "user", "content": prompt}],
            )
            return completion.content[0].text
