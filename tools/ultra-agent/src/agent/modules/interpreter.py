from __future__ import annotations
from dataclasses import dataclass
from ..llm import LLM
import json


@dataclass
class InterpretedRequest:
    raw: str
    summary: str
    implications: list[str]


class Interpreter:
    def __init__(self, llm: LLM):
        self.llm = llm

    async def interpret(self, request: str, system_prompt: str) -> InterpretedRequest:
        prompt = f"""
SYSTEM PROMPT:
{system_prompt}

TASK:
Interpret the user request below. Identify:
1. A high-level summary
2. All explicit requirements
3. All implicit and 7th+ order implications
4. Any hidden constraints or optimizations

USER REQUEST:
{request}

Respond in JSON:
{{
  "summary": "...",
  "implications": ["...", "..."]
}}
"""

        result = await self.llm.call(prompt)

        # Robust JSON parsing
        try:
            start = result.find('{')
            end = result.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = result[start:end]
                parsed = json.loads(json_str)
            else:
                parsed = {"summary": request, "implications": ["Could not parse implications"]}
        except Exception:
            parsed = {"summary": request, "implications": ["JSON parse error"]}

        return InterpretedRequest(
            raw=request,
            summary=parsed.get("summary", ""),
            implications=parsed.get("implications", []),
        )
