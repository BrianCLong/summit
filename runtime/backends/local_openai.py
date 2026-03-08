#!/usr/bin/env python3
"""Local OpenAI-compatible backend adapter for offline-first execution."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


class LocalOpenAIBackendError(RuntimeError):
    """Raised when the local backend cannot complete a request."""


@dataclass(frozen=True)
class CompletionResult:
    text: str
    model: str
    raw_response: dict[str, Any]


class LocalOpenAIBackend:
    """Deterministic wrapper around local OpenAI-compatible chat completions."""

    def __init__(
        self,
        base_url: str = "http://localhost:1234/v1",
        timeout_s: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def complete(
        self,
        prompt: str,
        model: str,
        temperature: float = 0,
    ) -> CompletionResult:
        payload = {
            "model": model,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        request = urllib.request.Request(
            url=f"{self.base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {os.getenv('LOCAL_OPENAI_API_KEY', 'lm-studio')}",
            },
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout_s) as response:
                response_data = json.loads(response.read().decode("utf-8"))
        except (TimeoutError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            raise LocalOpenAIBackendError(
                f"local backend request failed: {exc}"
            ) from exc

        choices = response_data.get("choices", [])
        if not choices:
            raise LocalOpenAIBackendError("local backend returned no choices")

        content = choices[0].get("message", {}).get("content", "")
        if not isinstance(content, str) or not content:
            raise LocalOpenAIBackendError("local backend returned empty content")

        return CompletionResult(text=content, model=model, raw_response=response_data)
