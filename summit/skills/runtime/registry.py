from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict

from ..format.skill_md import SkillMetadata, parse_skill_md


@dataclass(frozen=True)
class InstalledSkill:
    slug: str
    root: Path
    metadata: SkillMetadata

class SkillRegistry:
    def __init__(self) -> None:
        self._skills: dict[str, InstalledSkill] = {}

    def install_from_folder(self, slug: str, root: Path) -> InstalledSkill:
        raw = (root / "SKILL.md").read_text(encoding="utf-8")
        meta, _body = parse_skill_md(raw)  # Level-1 + Level-2 parse; Level-1 cache uses meta only
        skill = InstalledSkill(slug=slug, root=root, metadata=meta)
        self._skills[slug] = skill
        return skill

    def list_metadata(self) -> dict[str, SkillMetadata]:
        return {k: v.metadata for k, v in self._skills.items()}
