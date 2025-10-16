"""Prompt tuning and hardening utilities for web-based LLM sessions."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class PromptTuning:
    """Configuration describing how prompts should be prepared."""

    system_instruction: str
    style_guide: tuple[str, ...] = field(default_factory=tuple)
    safety_clauses: tuple[str, ...] = field(default_factory=tuple)
    max_prompt_chars: int = 4000
    temperature: float = 0.2
    max_tokens: int = 1024


class PromptEngineer:
    """Applies tuning and safety hardening to LLM prompts."""

    def __init__(self, tuning: PromptTuning) -> None:
        self._tuning = tuning

    @property
    def tuning(self) -> PromptTuning:
        return self._tuning

    def compose(self, user_prompt: str, context: Mapping[str, str] | None = None) -> str:
        """Combine system instructions, style hints and user prompt into one payload."""

        sections: list[str] = [
            "# System Instruction",
            self._tuning.system_instruction.strip(),
        ]
        if self._tuning.style_guide:
            sections.append("# Style Guide")
            sections.extend(f"- {item}" for item in self._tuning.style_guide)
        if context:
            sections.append("# Context")
            sections.extend(f"{key}: {value}" for key, value in context.items())
        sections.append("# User Prompt")
        sections.append(user_prompt.strip())
        prompt = "\n".join(sections)
        if len(prompt) > self._tuning.max_prompt_chars:
            raise ValueError("Prompt exceeds configured hard limit")
        return prompt

    def harden_prompt(self, prompt: str) -> str:
        """Inject explicit safety clauses at the top of the prompt."""

        clauses = "\n".join(f"- {clause}" for clause in self._tuning.safety_clauses)
        if not clauses:
            return prompt
        return "\n".join(["# Safety Clauses", clauses, prompt])

    def validate_response(self, response: str) -> None:
        """Very light-weight validation to ensure the response appears compliant."""

        prohibited_signatures: Iterable[str] = ("BEGIN_PROMPT_INJECTION", "UNSAFE_DIRECTIVE")
        lowered = response.lower()
        for signature in prohibited_signatures:
            if signature.lower() in lowered:
                raise ValueError("LLM response failed safety validation")

    def build_payload(self, user_prompt: str, context: Mapping[str, str] | None = None) -> str:
        """Compose and harden a prompt in one call."""

        prompt = self.compose(user_prompt=user_prompt, context=context)
        return self.harden_prompt(prompt)
