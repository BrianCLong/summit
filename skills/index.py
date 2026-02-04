import json
import os
from typing import Any, Dict, List

from .discover import find_skills
from .model import Skill


def build_index(root_dir: str) -> dict[str, Any]:
    """
    Builds a deterministic index of all skills found in root_dir.
    """
    skills_list = []

    for skill in find_skills(root_dir):
        skill_entry = {
            "name": skill.frontmatter.name,
            "description": skill.frontmatter.description,
            "path": skill.path,
            "sha256": skill.sha256,
            "license": skill.frontmatter.license,
            "compatibility": skill.frontmatter.compatibility,
            "allowed_tools": skill.frontmatter.allowed_tools,
            "metadata": skill.frontmatter.metadata
        }
        # Remove None values to keep JSON clean? Or keep for schema consistency?
        # Let's keep keys but null if schema requires.
        # Schema usually allows optional.
        skills_list.append(skill_entry)

    # Sort by name for determinism
    skills_list.sort(key=lambda x: x["name"])

    return {
        "version": 1,
        "items": skills_list
    }
