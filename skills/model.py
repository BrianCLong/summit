from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SkillFrontmatter:
    name: str
    description: str
    license: Optional[str] = None
    compatibility: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    allowed_tools: Optional[str] = field(default=None, metadata={"alias": "allowed-tools"})

@dataclass
class Skill:
    path: str
    frontmatter: SkillFrontmatter
    body: str
    sha256: str
