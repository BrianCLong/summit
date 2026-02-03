import pytest

from summit.policy.moral_profile_policy import assert_can_persist_profile


def test_deny_by_default_when_disabled():
    with pytest.raises(PermissionError):
        assert_can_persist_profile(enabled=False, purpose_tag="research")

def test_deny_when_missing_purpose_tag():
    with pytest.raises(PermissionError):
        assert_can_persist_profile(enabled=True, purpose_tag="  ")

def test_allow_when_enabled_and_tagged():
    assert_can_persist_profile(enabled=True, purpose_tag="model_eval")
