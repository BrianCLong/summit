import os

import pytest

from summit.agentloop.prompt_builder import PromptBuilder
from summit.context.agents_ingest import ingest_agents_instructions


def test_prompt_determinism(tmp_path):
    # Setup
    sandbox_md = "Sandbox Policy"
    tools = [{"name": "tool1"}]
    builder = PromptBuilder(sandbox_md=sandbox_md, tool_list=tools)

    # Mock files
    agents_file = tmp_path / "AGENTS.md"
    agents_file.write_text("Agents Instructions", encoding='utf-8')

    repo_root = str(tmp_path)
    agents_text = ingest_agents_instructions(repo_root)
    cwd = "/tmp/test"
    shell = "/bin/bash"

    # Run 1
    items1 = builder.initial_items(agents_text=agents_text, cwd=cwd, shell=shell)

    # Run 2
    items2 = builder.initial_items(agents_text=agents_text, cwd=cwd, shell=shell)

    assert items1 == items2
    assert len(items1) == 3
    assert items1[0].role == "developer"
    assert items1[0].content == "Sandbox Policy"
    assert items1[1].role == "user"
    assert "Agents Instructions" in items1[1].content
    assert items1[2].role == "user"
    assert "<cwd>/tmp/test</cwd>" in items1[2].content

def test_agents_ingest_size_limit(tmp_path):
    agents_file = tmp_path / "AGENTS.md"
    # Create content larger than 32KB
    large_content = "a" * (32 * 1024 + 100)
    agents_file.write_text(large_content, encoding='utf-8')

    repo_root = str(tmp_path)
    content = ingest_agents_instructions(repo_root)

    assert "truncated" in content
    assert len(content.encode('utf-8')) <= 32 * 1024 + 200 # approx check allowing for warning msg
