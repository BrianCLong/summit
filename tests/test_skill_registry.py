import pytest
from pathlib import Path
import yaml
from summit.skills.registry import SkillRegistry

def test_registry_scan(tmp_path):
    # Setup fixture
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()

    skill_dir = skills_dir / "test_skill"
    skill_dir.mkdir()
    (skill_dir / "skill.yaml").write_text("id: test_skill\nname: Test Skill")

    registry = SkillRegistry(skills_dir)
    registry.scan()

    skills = registry.list()
    assert len(skills) == 1
    assert skills[0].id == "test_skill"
    assert skills[0].name == "Test Skill"

def test_registry_real_fixture():
    # Test against the repo's 'skills' directory
    # Assuming tests/test_skill_registry.py is in tests/
    # Repo root is tests/..
    repo_root = Path(__file__).resolve().parent.parent
    # The fixture is in skills/fixtures/good_minimal_skill, so we point registry to skills/fixtures
    skills_dir = repo_root / "skills" / "fixtures"

    if not skills_dir.exists():
        pytest.skip("repo skills dir not found")

    registry = SkillRegistry(skills_dir)
    registry.scan()

    skill = registry.get("good_minimal_skill")
    assert skill is not None
    assert skill.name == "Good Minimal Skill"
