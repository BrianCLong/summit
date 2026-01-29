from pathlib import Path
from .registry import SkillRegistry
import os

class ResourceResolver:
    """
    Level-3 progressive disclosure: resolve scripts/assets on demand.
    """
    def __init__(self, registry: SkillRegistry):
        self._registry = registry

    def get_resource_path(self, skill_id: str, resource_name: str) -> Path:
        skill = self._registry.get(skill_id)
        if not skill:
            raise ValueError(f"Skill {skill_id} not found")

        # Basic validation
        if ".." in resource_name or resource_name.startswith("/") or "\\" in resource_name:
             raise ValueError(f"Invalid resource name: {resource_name}")

        resources_dir = skill.root / "resources"
        resource_path = (resources_dir / resource_name).resolve()

        # Security check: ensure resolved path is within resources_dir
        # We need resources_dir to be resolved too
        try:
            resources_dir_resolved = resources_dir.resolve()
        except FileNotFoundError:
            # If resources dir doesn't exist, we can't have resources
             raise FileNotFoundError(f"Skill {skill_id} has no resources directory")

        if not str(resource_path).startswith(str(resources_dir_resolved)):
            raise ValueError(f"Access denied: Resource {resource_name} is outside skill resources directory")

        if not resource_path.exists():
             raise FileNotFoundError(f"Resource {resource_name} not found in skill {skill_id}")

        return resource_path

    def read_resource(self, skill_id: str, resource_name: str) -> bytes:
        path = self.get_resource_path(skill_id, resource_name)
        return path.read_bytes()
