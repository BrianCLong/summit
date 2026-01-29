import pytest
from pathlib import Path
from summit.skills.registry import SkillRegistry
from summit.skills.loader import SkillLoader
from summit.skills.resources import ResourceResolver

def test_loader_instructions(tmp_path):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()

    skill_dir = skills_dir / "test_skill"
    skill_dir.mkdir()
    (skill_dir / "skill.yaml").write_text("id: test_skill\nname: Test Skill")
    (skill_dir / "SKILL.md").write_text("# Instructions\nDo this.")

    registry = SkillRegistry(skills_dir)
    registry.scan()

    loader = SkillLoader(registry)
    instructions = loader.load_instructions("test_skill")
    assert "# Instructions" in instructions
    assert "Do this." in instructions

def test_resources_resolver(tmp_path):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()

    skill_dir = skills_dir / "resource_skill"
    skill_dir.mkdir()
    (skill_dir / "skill.yaml").write_text("id: resource_skill")

    res_dir = skill_dir / "resources"
    res_dir.mkdir()
    (res_dir / "script.py").write_text("print('hello')")

    registry = SkillRegistry(skills_dir)
    registry.scan()

    resolver = ResourceResolver(registry)

    # Positive
    content = resolver.read_resource("resource_skill", "script.py")
    assert content == b"print('hello')"

    # Negative: Traversal
    with pytest.raises(ValueError, match="Invalid resource name"):
        resolver.get_resource_path("resource_skill", "../skill.yaml")

    # Negative: Missing
    with pytest.raises(FileNotFoundError):
        resolver.get_resource_path("resource_skill", "missing.py")
