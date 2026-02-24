#!/usr/bin/env python3
"""Lint tooling prompt templates for required sections."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMPTS = [
    ROOT / "agents" / "prompts" / "base_prompt.md",
    ROOT / "agents" / "prompts" / "tooling_task_template.md",
]
REQUIRED_HEADERS = ["## Context", "## Task", "## Output Schema", "## Safety"]


def main() -> int:
    for prompt in PROMPTS:
        if not prompt.exists():
            raise SystemExit(f"tooling-prompt-lint: missing prompt file: {prompt}")
        text = prompt.read_text(encoding="utf-8")
        for header in REQUIRED_HEADERS:
            if header not in text:
                raise SystemExit(f"tooling-prompt-lint: missing '{header}' in {prompt}")
    print("tooling-prompt-lint: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
