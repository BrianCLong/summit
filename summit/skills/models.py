"""
Skill Model Definitions
Defines a first-class Skill abstraction (name, signature, preconditions, postconditions, tests, owners).
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class EnvironmentAssumptions:
    required_env_vars: list[str]
    required_binaries: list[str]
    network_access: list[str]

@dataclass
class SkillSignature:
    inputs: dict[str, str]  # Param name -> type
    outputs: dict[str, str]

@dataclass
class SkillTest:
    name: str
    assertions: list[str]
    mock_data: Optional[dict[str, Any]] = None

@dataclass
class Skill:
    name: str
    version: str
    description: str
    signature: SkillSignature
    preconditions: list[str]
    postconditions: list[str]
    environment: EnvironmentAssumptions
    examples: list[dict[str, Any]]
    tests: list[SkillTest]
    owners: list[str]

    def to_mcp_artifact(self) -> dict[str, Any]:
        """
        Serializes the Skill to a portable MCP-addressable artifact format.
        """
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "owners": self.owners
        }
