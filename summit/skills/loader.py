from pathlib import Path
from .registry import SkillRegistry, SkillMeta

class SkillLoader:
    """
    Level-2 progressive disclosure: load SKILL.md instructions on demand.
    """
    def __init__(self, registry: SkillRegistry):
        self._registry = registry

    def load_instructions(self, skill_id: str) -> str:
        skill = self._registry.get(skill_id)
        if not skill:
            raise ValueError(f"Skill {skill_id} not found")

        path = skill.root / "SKILL.md"
        if not path.exists():
            return ""

        return path.read_text(encoding="utf-8")
