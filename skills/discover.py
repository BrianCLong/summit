import os
from typing import Generator, List

from .loader import load_skill
from .model import Skill


def find_skills(root_dir: str) -> Generator[Skill, None, None]:
    """
    Recursively finds SKILL.md files in the given root directory.
    Yields parsed Skill objects.
    """
    for dirpath, _, filenames in os.walk(root_dir):
        if "SKILL.md" in filenames:
            filepath = os.path.join(dirpath, "SKILL.md")
            try:
                skill = load_skill(filepath)
                yield skill
            except Exception as e:
                # Log warning but continue? Or raise?
                # For now, print to stderr and skip
                print(f"Warning: Failed to load skill at {filepath}: {e}")
