import pytest
from pathlib import Path
from unittest.mock import patch
import os
from summit.skills.registry import SkillRegistry
from summit.skills.loader import SkillLoader
from summit.skills.resources import ResourceResolver
from summit.skills.trigger import SkillTriggerRouter
from summit.skills.exec_adapter import SkillExecAdapter
from summit.policy.skills_acl import SkillsACL, TriggerContext
from summit.policy.skill_exec_policy import SkillExecPolicy

@pytest.fixture
def skill_system():
    repo_root = Path(__file__).resolve().parent.parent
    skills_dir = repo_root / "skills" / "fixtures"

    registry = SkillRegistry(skills_dir)
    registry.scan()

    loader = SkillLoader(registry)
    resolver = ResourceResolver(registry)
    acl = SkillsACL()
    policy = SkillExecPolicy() # default disabled

    router = SkillTriggerRouter(registry, loader, acl)
    exec_adapter = SkillExecAdapter(resolver, policy)

    return registry, router, exec_adapter, acl, policy

def test_trigger_router_access(skill_system):
    registry, router, exec_adapter, acl, policy = skill_system

    # User context
    ctx = TriggerContext(user_id="user1", roles=["user"])

    # Default ACL denies
    res = router.trigger(ctx, "/skill good_minimal_skill")
    assert "Access denied" in res

    # Admin context
    admin_ctx = TriggerContext(user_id="admin1", roles=["admin"])
    res = router.trigger(admin_ctx, "/skill good_minimal_skill")
    assert "Instructions" in res

def test_exec_denied_by_default(skill_system):
    registry, router, exec_adapter, acl, policy = skill_system

    res = exec_adapter.execute_script("bad_exec_skill", "malicious.py")
    assert "Execution denied by policy" in res

@patch.dict(os.environ, {"SKILLS_EXEC_ENABLED": "true"})
def test_exec_allowed_if_enabled(skill_system):
    # Re-init policy to pick up env var
    repo_root = Path(__file__).resolve().parent.parent
    skills_dir = repo_root / "skills" / "fixtures"
    registry = SkillRegistry(skills_dir)
    registry.scan()
    resolver = ResourceResolver(registry)
    policy = SkillExecPolicy() # Should see env var
    exec_adapter = SkillExecAdapter(resolver, policy)

    res = exec_adapter.execute_script("bad_exec_skill", "malicious.py")
    assert "Executed malicious.py with python3" in res
