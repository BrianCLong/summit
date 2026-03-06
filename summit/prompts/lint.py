from typing import Any, Dict, List, Optional

from .load import load_prompt_artifact


class LintRule:
    id: str
    description: str

    def check(self, prompt: dict[str, Any]) -> list[str]:
        raise NotImplementedError

class OutputFormatRule(LintRule):
    id = "LINT:OUTPUT-FORMAT"
    description = "Ensure output format or schema is defined."

    def check(self, prompt: dict[str, Any]) -> list[str]:
        if "output_schema" not in prompt and "output_format" not in prompt:
            return ["Missing 'output_schema' or 'output_format'."]
        return []

class MaxExamplesRule(LintRule):
    id = "LINT:MAX-EXAMPLES"
    description = "Ensure number of examples does not exceed budget."

    def check(self, prompt: dict[str, Any]) -> list[str]:
        budget = prompt.get("budgets", {}).get("max_examples", 5)
        components = prompt.get("components", {})
        examples = components.get("examples", [])
        if len(examples) > budget:
            return [f"Example count ({len(examples)}) exceeds budget ({budget})."]
        return []

class ContextRule(LintRule):
    id = "LINT:CONTEXT-REQ"
    description = "Ensure context rules are present if context is required."

    def check(self, prompt: dict[str, Any]) -> list[str]:
        if prompt.get("requires_context", False):
            components = prompt.get("components", {})
            if not components.get("context_rules"):
                return ["'requires_context' is True but 'components.context_rules' is empty/missing."]
        return []

class VaguenessRule(LintRule):
    id = "LINT:VAGUENESS"
    description = "Check for vague task descriptions."

    VAGUE_PHRASES = ["write something about", "do whatever", "anything goes"]

    def check(self, prompt: dict[str, Any]) -> list[str]:
        task_desc = prompt.get("components", {}).get("task_description", "").lower()
        errors = []
        for phrase in self.VAGUE_PHRASES:
            if phrase in task_desc:
                errors.append(f"Task description contains vague phrase: '{phrase}'.")
        return errors

ALL_RULES = [OutputFormatRule(), MaxExamplesRule(), ContextRule(), VaguenessRule()]

def lint_prompt(prompt: dict[str, Any]) -> list[str]:
    errors = []
    for rule in ALL_RULES:
        errors.extend([f"[{rule.id}] {msg}" for msg in rule.check(prompt)])
    return errors
