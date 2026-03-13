import pytest
from summit.registry.service import SkillRegistryService
from summit.skills.models import Skill

def test_register_skill():
    service = SkillRegistryService()
    skill = Skill(
        name="test-skill",
        version="1.0.0",
        description="A test skill",
        endpoint="http://localhost:8080",
        auth_type="none"
    )
    result = service.register_skill(skill)
    assert result == "test-skill@1.0.0 registered successfully."
    assert service.get_skill("test-skill", "1.0.0") == skill

def test_get_skill():
    service = SkillRegistryService()
    skill = Skill(
        name="test-skill",
        version="1.0.0",
        description="A test skill",
        endpoint="http://localhost:8080",
        auth_type="none"
    )
    service.register_skill(skill)

    assert service.get_skill("test-skill") == skill
    assert service.get_skill("test-skill", "1.0.0") == skill
    assert service.get_skill("non-existent") is None
