"""
Skill Registry Service
Backing the Skill abstraction, versioned and MCP-addressable.
"""
from typing import Any, Dict, List, Optional

from summit.skills.models import Skill


class SkillRegistryService:
    def __init__(self):
        self.skills_db: dict[str, dict[str, Skill]] = {}  # name -> version -> Skill

    def register_skill(self, skill: Skill) -> str:
        """
        Registers a new Skill or version in the service.
        """
        if skill.name not in self.skills_db:
            self.skills_db[skill.name] = {}

        if skill.version in self.skills_db[skill.name]:
             print(f"Warning: Overwriting {skill.name} v{skill.version}")

        self.skills_db[skill.name][skill.version] = skill
        return f"{skill.name}@{skill.version} registered successfully."

    def get_skill(self, name: str, version: Optional[str] = None) -> Optional[Skill]:
        """
        Retrieves a skill by name and version. If version is None, retrieves latest.
        """
        if name not in self.skills_db:
             return None

        versions = self.skills_db[name]
        if not versions:
            return None

        if version:
             return versions.get(version)

        # Simple resolution for 'latest' assuming semantic version sorting or string match
        # In a real system, we'd use a real semver parse
        latest_version = sorted(list(versions.keys()))[-1]
        return versions[latest_version]

    def list_skills(self) -> list[dict[str, Any]]:
        """
        Returns portable artifacts for all skills.
        """
        artifacts = []
        for name, versions in self.skills_db.items():
            for version, skill in versions.items():
                artifacts.append(skill.to_mcp_artifact())
        return artifacts
