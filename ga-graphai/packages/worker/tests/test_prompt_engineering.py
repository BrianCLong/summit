import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from prompt_engineering import PromptEngineer, PromptTuning


def test_build_payload_includes_sections():
    tuning = PromptTuning(
        system_instruction="Follow corporate policy",
        style_guide=("Use neutral tone",),
        safety_clauses=("No secrets",),
        max_prompt_chars=500,
        temperature=0.1,
        max_tokens=200,
    )
    engineer = PromptEngineer(tuning)
    payload = engineer.build_payload("Summarize the ticket", {"ticket": "ABC-123"})

    assert "# System Instruction" in payload
    assert "# Style Guide" in payload
    assert "ticket: ABC-123" in payload
    assert "# Safety Clauses" in payload


def test_validate_response_blocks_injections():
    tuning = PromptTuning(system_instruction="Stay safe")
    engineer = PromptEngineer(tuning)

    with pytest.raises(ValueError):
        engineer.validate_response("BEGIN_PROMPT_INJECTION do bad things")
