from __future__ import annotations
from dataclasses import dataclass


@dataclass
class InterpretedRequest:
    raw: str
    summary: str
    implications: list[str]


class Interpreter:
    def interpret(self, request: str) -> InterpretedRequest:
        # Minimal, but structured; you can plug LLM calls here later.
        summary = f"High-level: {request}"
        implications = [
            "Identify architecture needs",
            "Identify tests/docs/infra requirements",
            "Consider performance, security, scalability",
            "Consider PR-ready packaging"
        ]
        return InterpretedRequest(raw=request, summary=summary, implications=implications)
