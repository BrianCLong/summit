import hashlib
from typing import Optional, Tuple

import yaml

from .model import Skill, SkillFrontmatter


def parse_frontmatter(content: str) -> tuple[Optional[dict], str]:
    """
    Parses YAML frontmatter from a string.
    Returns (frontmatter_dict, body).
    """
    if content.startswith("---\n"):
        parts = content.split("---\n", 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1])
                body = parts[2]
                return fm, body
            except yaml.YAMLError:
                pass
    return None, content

def load_skill(filepath: str) -> Skill:
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Calculate hash of full content
    sha256 = hashlib.sha256(content.encode('utf-8')).hexdigest()

    fm_dict, body = parse_frontmatter(content)

    if not fm_dict:
        raise ValueError(f"No valid frontmatter found in {filepath}")

    # Map 'allowed-tools' to 'allowed_tools'
    if 'allowed-tools' in fm_dict:
        fm_dict['allowed_tools'] = fm_dict.pop('allowed-tools')

    # Basic validation
    if 'name' not in fm_dict or 'description' not in fm_dict:
        raise ValueError(f"Missing required frontmatter fields (name, description) in {filepath}")

    frontmatter = SkillFrontmatter(**fm_dict)

    return Skill(
        path=filepath,
        frontmatter=frontmatter,
        body=body,
        sha256=sha256
    )
