import pytest
from summit.registry.service import SkillRegistryService
from summit.skills.models import Skill, SkillSignature, EnvironmentAssumptions, SkillTest

def test_register_skill():
    service = SkillRegistryService()

    skill = Skill(
        name="test-skill",
        version="1.0.0",
        description="A test skill",
        signature=SkillSignature(inputs={"a": "str"}, outputs={"b": "str"}),
        preconditions=[],
        postconditions=[],
        environment=EnvironmentAssumptions([], [], []),
        examples=[],
        tests=[],
        owners=["team-a"]
    )

    result = service.register_skill(skill)
    assert result == "test-skill@1.0.0 registered successfully."
    assert service.get_skill("test-skill", "1.0.0") == skill

def test_get_skill_latest():
    service = SkillRegistryService()

    skill_1 = Skill(
        name="test-skill",
        version="1.0.0",
        description="A test skill v1",
        signature=SkillSignature(inputs={}, outputs={}),
        preconditions=[],
        postconditions=[],
        environment=EnvironmentAssumptions([], [], []),
        examples=[],
        tests=[],
        owners=["team-a"]
    )

    skill_2 = Skill(
        name="test-skill",
        version="1.1.0",
        description="A test skill v2",
        signature=SkillSignature(inputs={}, outputs={}),
        preconditions=[],
        postconditions=[],
        environment=EnvironmentAssumptions([], [], []),
        examples=[],
        tests=[],
        owners=["team-a"]
    )

    service.register_skill(skill_1)
    service.register_skill(skill_2)

    # Should return the latest version
    assert service.get_skill("test-skill") == skill_2

def test_get_skill_not_found():
    service = SkillRegistryService()
    assert service.get_skill("non-existent") is None
