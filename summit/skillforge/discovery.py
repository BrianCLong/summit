"""
SkillForge: Discovery Module
Parses TMAML episodic memory logs to propose new reusable capabilities.
"""
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class ProposedSkill:
    name: str
    description: str
    trajectory_hash: str
    tools_used: list[str]

def parse_tmaml_logs(logs: list[dict[str, Any]]) -> list[ProposedSkill]:
    """
    Identifies repeated trajectories or sub-tasks in TMAML logs suitable to be turned into reusable skills.
    Returns a list of ProposedSkill candidate abstracts.
    """
    proposed = []
    # Mock discovery logic
    for log in logs:
        if "triage CI failure" in log.get("task", ""):
            proposed.append(ProposedSkill(
                name="triage-ci-failure",
                description="Automatically parse and triage CI failures",
                trajectory_hash="mock_hash_123",
                tools_used=["read_file", "run_in_bash_session"]
            ))
        elif "harden new MCP tool config" in log.get("task", ""):
            proposed.append(ProposedSkill(
                name="harden-mcp-tool",
                description="Hardens the configuration of a newly added MCP tool",
                trajectory_hash="mock_hash_456",
                tools_used=["write_file", "run_in_bash_session"]
            ))
    return proposed
