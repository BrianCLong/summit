from __future__ import annotations

import os
from abc import ABC, abstractmethod


class BaseJudge(ABC):
    @abstractmethod
    def is_equivalent(self, candidate: str, truth: str) -> bool:
        """
        Determines if a candidate answer item is semantically equivalent to a ground truth item.
        """
        pass

class ExactMatchJudge(BaseJudge):
    """
    Deterministic judge that uses normalized string comparison.
    """
    def is_equivalent(self, candidate: str, truth: str) -> bool:
        return candidate.strip().lower() == truth.strip().lower()

class LLMJudge(BaseJudge):
    """
    Abstraction for an LLM-as-a-judge.
    Actual model calls should be plugged in via a provider.
    """
    def __init__(self, prompt_template: str):
        self.prompt_template = prompt_template

    def is_equivalent(self, candidate: str, truth: str) -> bool:
        # LLM judge is intentionally not fully implemented in this PR
        # to avoid hard-coding providers.
        raise NotImplementedError("LLM Judge requires a model provider implementation.")

def get_judge(mode: str = "off") -> BaseJudge:
    """
    Factory to get the judge based on the requested mode.
    Defaults to 'off' (ExactMatchJudge).
    """
    if mode == "off":
        return ExactMatchJudge()
    elif mode == "llm":
        prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "judge_prompt_v1.txt")
        if not os.path.exists(prompt_path):
            raise FileNotFoundError(f"Judge prompt not found at: {prompt_path}")
        with open(prompt_path, encoding="utf-8") as f:
            template = f.read()
        return LLMJudge(template)
    else:
        raise ValueError(f"Unknown judge mode: {mode}")
