from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.S)

@dataclass(frozen=True)
class SkillMetadata:
    name: str
    description: str

def parse_skill_md(raw: str) -> tuple[SkillMetadata, str]:
    """
    Parse SKILL.md using YAML-frontmatter-like delimiters.
    Required keys: name, description
    NOTE: This is a minimal parser; replace with a real YAML parser if available.
    """
    m = _FRONTMATTER_RE.match(raw.strip() + "\n")
    if not m:
        raise ValueError("SKILL.md missing frontmatter block")
    fm, body = m.group(1), m.group(2)
    meta = {}
    for line in fm.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"').strip("'")
    if "name" not in meta or "description" not in meta:
        raise ValueError("frontmatter missing required keys: name, description")
    return SkillMetadata(name=meta["name"], description=meta["description"]), body.strip()
