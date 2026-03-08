import os

import pytest

from summit.agent.context.agents_md_loader import MAX_BYTES, POLICY_PREAMBLE_PATH, load_agents_md


def test_budget_enforcement(tmp_path):
    # Create a large AGENTS.md
    large_content = "A" * (MAX_BYTES + 1000)
    agents_md = tmp_path / "AGENTS.md"
    agents_md.write_text(large_content, encoding="utf-8")

    # Mock policy preamble to be empty or known size for precise calculation
    # But since we prepend preamble, result size > MAX_BYTES logic in loader applies to *content*?
    # No, loader truncates *content* to MAX_BYTES, then adds preamble.

    result = load_agents_md(str(tmp_path))

    # Check that the context part is truncated
    # The result contains preamble + separator + content

    # We can check that the "content" part is not longer than MAX_BYTES
    # But wait, python string length != byte length.
    # The loader enforces byte length.

    # Let's verify the logic in loader:
    # encoded = sanitized_content.encode("utf-8")[:MAX_BYTES]

    # So the content part should be roughly MAX_BYTES.

    assert "--- AGENTS.md Context ---" in result
    parts = result.split("--- AGENTS.md Context ---")
    content_part = parts[1].strip()

    assert len(content_part.encode("utf-8")) <= MAX_BYTES

def test_no_agents_md(tmp_path):
    result = load_agents_md(str(tmp_path))
    assert "SYSTEM POLICY" in result
    assert "--- AGENTS.md Context ---" not in result
