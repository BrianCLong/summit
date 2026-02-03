from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Tuple

@dataclass(frozen=True)
class SkillFrontmatter:
    name: str
    description: str
    compatibility: str | None = None
    use_for: list[str] | None = None
    do_not_use_for: list[str] | None = None

def split_frontmatter(md: str) -> Tuple[Dict[str, Any], str]:
    """
    Clean-room parser:
      - expects optional YAML frontmatter delimited by '---' lines at top
      - returns (frontmatter_dict, body_markdown)
    TODO: plug in a YAML parser used elsewhere in Summit, or implement minimal subset.
    """
    lines = md.splitlines()
    if not (lines and lines[0].strip() == "---"):
        return {}, md
    # find closing delimiter
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, md  # deny-by-default handled by caller
    yaml_block = "\n".join(lines[1:end])
    body = "\n".join(lines[end+1:])
    # TODO: parse YAML safely. For now, extremely minimal key: value lines.
    fm: Dict[str, Any] = {}
    for raw in yaml_block.splitlines():
        if ":" not in raw:
            continue
        k, v = raw.split(":", 1)
        fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm, body

def normalize_frontmatter(fm: Dict[str, Any]) -> SkillFrontmatter:
    name = str(fm.get("name", "")).strip()
    desc = str(fm.get("description", "")).strip()
    if not name or not desc:
        raise ValueError("SKILL frontmatter must include non-empty name + description")
    return SkillFrontmatter(
        name=name,
        description=desc,
        compatibility=(str(fm["compatibility"]).strip() if "compatibility" in fm else None),
    )
