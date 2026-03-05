import pytest

from src.skills.format.skill_md import SkillMetadata, parse_skill_md


def test_parse_skill_md_valid():
    raw = """---
name: test-skill
description: A test skill
---
Body content here.
"""
    meta, body = parse_skill_md(raw)
    assert meta.name == "test-skill"
    assert meta.description == "A test skill"
    assert body == "Body content here."

def test_parse_skill_md_invalid():
    raw = "No frontmatter"
    with pytest.raises(ValueError, match="SKILL.md missing frontmatter block"):
        parse_skill_md(raw)

def test_parse_skill_md_missing_keys():
    raw = """---
name: test-skill
---
Body content
"""
    with pytest.raises(ValueError, match="frontmatter missing required keys: name, description"):
        parse_skill_md(raw)
