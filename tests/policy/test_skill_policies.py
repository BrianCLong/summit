import pytest
import os
from unittest.mock import patch
from pathlib import Path
from summit.policy.skills_acl import SkillsACL, TriggerContext
from summit.policy.skill_exec_policy import SkillExecPolicy

def test_acl_deny_by_default():
    acl = SkillsACL()
    ctx = TriggerContext(user_id="user1", roles=["user"])
    assert acl.can_trigger(ctx, "some_skill") is False

def test_acl_admin_allow():
    acl = SkillsACL()
    ctx = TriggerContext(user_id="admin1", roles=["admin"])
    assert acl.can_trigger(ctx, "some_skill") is True

def test_exec_policy_disabled_by_default():
    policy = SkillExecPolicy()
    assert policy.enabled is False
    assert policy.check_exec("skill1", "python3", Path("script.py")) is False

@patch.dict(os.environ, {"SKILLS_EXEC_ENABLED": "true"})
def test_exec_policy_enabled():
    policy = SkillExecPolicy()
    assert policy.enabled is True

    # Allowed interpreter
    assert policy.check_exec("skill1", "python3", Path("script.py")) is True

    # Forbidden interpreter
    assert policy.check_exec("skill1", "ruby", Path("script.rb")) is False
