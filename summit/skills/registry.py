from dataclasses import dataclass
from pathlib import Path
import yaml
import logging

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class SkillMeta:
    id: str
    name: str
    description: str
    root: Path

class SkillRegistry:
    """
    Level-1 progressive disclosure: read only skill.yaml at startup.
    """
    def __init__(self, skills_dir: Path):
        self._skills_dir = skills_dir
        self._by_id: dict[str, SkillMeta] = {}

    def scan(self) -> None:
        self._by_id.clear()
        if not self._skills_dir.exists():
            logger.warning(f"Skills directory {self._skills_dir} does not exist.")
            return

        for d in sorted(self._skills_dir.glob("*")):
            if not d.is_dir():
                continue
            meta_path = d / "skill.yaml"
            if not meta_path.exists():
                continue
            try:
                meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
                sid = str(meta.get("id") or d.name)
                self._by_id[sid] = SkillMeta(
                    id=sid,
                    name=str(meta.get("name", sid)),
                    description=str(meta.get("description", "")),
                    root=d,
                )
            except Exception as e:
                logger.error(f"Failed to load skill from {d}: {e}")

    def list(self) -> list[SkillMeta]:
        return [self._by_id[k] for k in sorted(self._by_id)]

    def get(self, skill_id: str) -> SkillMeta | None:
        return self._by_id.get(skill_id)
