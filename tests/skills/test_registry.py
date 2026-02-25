from pathlib import Path

from src.skills.runtime.registry import SkillRegistry


def test_registry_install(tmp_path):
    skill_dir = tmp_path / "my-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: my-skill
description: descriptive
---
body
""")

    registry = SkillRegistry()
    skill = registry.install_from_folder("my-slug", skill_dir)

    assert skill.slug == "my-slug"
    assert skill.metadata.name == "my-skill"
    assert "my-slug" in registry.list_metadata()
