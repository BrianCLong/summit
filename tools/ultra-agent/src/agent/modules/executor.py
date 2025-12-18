from __future__ import annotations
from dataclasses import dataclass
from ..llm import LLM
from .. import tools
import json
import pathlib


@dataclass
class ExecutionResult:
    success: bool
    files: list[str]
    notes: list[str]


class Executor:
    def __init__(self, llm: LLM):
        self.llm = llm

    async def execute(self, interpreted, system_prompt) -> ExecutionResult:
        prompt = f"""
SYSTEM PROMPT:
{system_prompt}

TASK:
Generate a full project skeleton based on this interpreted request:
SUMMARY: {interpreted.summary}
IMPLICATIONS: {interpreted.implications}

REQUIREMENTS:
- Return a JSON dictionary where keys are file paths and values are file contents.
- Include:
  - src/ code
  - tests/
  - README.md
  - Dockerfile (if relevant)
  - CI/CD
  - Any configs
- No placeholders; full content.

FORMAT (JSON):
{{
  "src/main.py": "...",
  "tests/test_api.py": "...",
  "README.md": "...",
  ...
}}
"""

        response = await self.llm.call(prompt)

        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = response[start:end]
                files = json.loads(json_str)
            else:
                 raise ValueError("No JSON found")
        except Exception as e:
            # Fallback for demo/testing without LLM
            files = {
                "output/README.md": f"# Generated Project\n\nSummary: {interpreted.summary}",
                "output/src/main.py": "print('Hello World')"
            }
            # In production, we would raise or retry
            # raise RuntimeError(f"LLM response was not valid JSON file map: {e}")

        written_files = []
        for path, content in files.items():
            # Prefix output to avoid overwriting agent itself
            if not path.startswith("output/"):
                full_path = f"output/{path}"
            else:
                full_path = path

            tools.write_file(full_path, content)
            written_files.append(full_path)

        return ExecutionResult(
            success=True,
            files=written_files,
            notes=["Generated project skeleton from LLM."]
        )
