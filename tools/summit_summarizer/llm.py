from dataclasses import dataclass
from typing import Protocol


class LLMClient(Protocol):
    """Lightweight protocol used by the pipeline to talk to LLMs."""

    def complete(
        self, prompt: str, *, system_prompt: str | None = None, temperature: float = 0.2
    ) -> str: ...


@dataclass
class OpenAILLMClient:
    """Thin wrapper around the OpenAI client for chat completion calls.

    The import is deferred until invocation to avoid forcing the dependency
    during testing. The caller must set the `OPENAI_API_KEY` environment
    variable and may override the `model` used for completions.
    """

    model: str = "gpt-4o-mini"

    def complete(
        self, prompt: str, *, system_prompt: str | None = None, temperature: float = 0.2
    ) -> str:
        from openai import OpenAI

        client = OpenAI()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=self.model,
            temperature=temperature,
            messages=messages,
        )
        return response.choices[0].message.content or ""
