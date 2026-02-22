import pytest
from summit.policy.router import route, PolicyDecision, route_request

def test_route_flag_off():
    context = {"feature_flags": {"SKILL_PRESERVING_MODE": False}}
    decision = route(context)
    assert decision.mode == "baseline"
    assert "flag_off" in decision.reasons

def test_route_flag_on_no_org_policy():
    context = {"feature_flags": {"SKILL_PRESERVING_MODE": True}}
    decision = route(context)
    assert decision.mode == "baseline"
    assert "org_policy_deny" in decision.reasons

def test_route_flag_on_none_org_policy():
    # Edge case: key exists but is None
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": None
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "org_policy_deny" in decision.reasons

def test_route_flag_on_org_policy_deny():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": False}
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "org_policy_deny" in decision.reasons

def test_route_flag_on_org_allow_no_user_opt_in():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True}
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "user_opt_out" in decision.reasons

def test_route_flag_on_org_allow_none_user_opt_in():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True},
        "user_settings": None
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "user_opt_out" in decision.reasons

def test_route_flag_on_org_allow_user_opt_out():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True},
        "user_settings": {"opt_in_skill_preserving": False}
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "user_opt_out" in decision.reasons

def test_route_all_checks_pass():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True},
        "user_settings": {"opt_in_skill_preserving": True}
    }
    decision = route(context)
    assert decision.mode == "skill_preserving"
    assert "flag_on" in decision.reasons

# New edge cases for refactored router
def test_route_invalid_context():
    decision = route("not a dict")
    assert decision.policy_id == "POL-ERROR"
    assert "invalid_context" in decision.reasons

def test_route_malformed_flags():
    context = {"feature_flags": "not a dict"}
    decision = route(context)
    assert decision.mode == "baseline"
    assert "flag_off" in decision.reasons

def test_route_malformed_org_policy():
    context = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": "not a dict"
    }
    decision = route(context)
    assert decision.mode == "baseline"
    assert "org_policy_deny" in decision.reasons

def test_route_request_invalid_request():
    decision = route_request("not a dict", {})
    assert decision.provider_id == "openai"
    assert decision.reason == "default"
