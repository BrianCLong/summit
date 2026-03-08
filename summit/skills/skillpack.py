from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from summit.skills.frontmatter import SkillFrontmatter, normalize_frontmatter, split_frontmatter


@dataclass(frozen=True)
class SkillPack:
    root: Path
    frontmatter: SkillFrontmatter
    body_md: str

    @property
    def references_dir(self) -> Path:
        return self.root / "references"

    @property
    def scripts_dir(self) -> Path:
        return self.root / "scripts"

def load_skillpack(root: Path) -> SkillPack:
    skill_md = root / "SKILL.md"
    raw = skill_md.read_text(encoding="utf-8")
    fm, body = split_frontmatter(raw)
    sfm = normalize_frontmatter(fm)
    return SkillPack(root=root, frontmatter=sfm, body_md=body)
