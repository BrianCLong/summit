from typing import List, Optional

from .spec import BuilderSpec


class ElicitationEngine:
    def __init__(self):
        # In a real app, this would interface with an LLM
        pass

    def get_clarifying_questions(self, spec: BuilderSpec) -> list[str]:
        questions = []
        if not spec.document_types:
            questions.append("What types of documents are you processing?")
        if not spec.target_schema:
            questions.append("What fields do you want to extract?")
        return questions

    def update_spec(self, spec: BuilderSpec, user_input: str) -> BuilderSpec:
        # Simplistic "parser" for demo purposes
        # In reality, this would be an LLM call to extract structured data from user_input
        new_types = list(spec.document_types)
        if "invoice" in user_input.lower() and "invoice" not in new_types:
            new_types.append("invoice")

        return BuilderSpec(
            intent=spec.intent,
            target_schema=spec.target_schema,
            document_types=new_types,
            constraints=spec.constraints
        )
