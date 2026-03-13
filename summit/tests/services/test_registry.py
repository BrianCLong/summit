import pytest
from summit.registry.service import SkillRegistryService
from summit.skills.models import Skill, SkillSignature, EnvironmentAssumptions

def test_register_skill():
    service = SkillRegistryService()
    skill = Skill(
        name="TestSkill",
        version="1.0.0",
        description="desc",
        signature=SkillSignature(inputs={}, outputs={}),
        preconditions=[],
        postconditions=[],
        environment=EnvironmentAssumptions(required_env_vars=[], required_binaries=[], network_access=[]),
        examples=[],
        tests=[],
        owners=["test_owner"]
    )
    res = service.register_skill(skill)
    assert res == "TestSkill@1.0.0 registered successfully."
    assert service.get_skill("TestSkill", "1.0.0") == skill
