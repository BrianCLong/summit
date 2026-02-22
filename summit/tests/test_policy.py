import pytest
from summit.policy.router import route, route_request, PolicyDecision, RoutingDecision

def test_route_default():
    ctx = {}
    decision = route(ctx)
    assert decision.mode == "baseline"
    assert "flag_off" in decision.reasons

def test_route_enabled_but_org_deny():
    ctx = {"feature_flags": {"SKILL_PRESERVING_MODE": True}, "org_policy": {"allow_skill_preserving": False}}
    decision = route(ctx)
    assert decision.mode == "baseline"
    assert "org_policy_deny" in decision.reasons

def test_route_enabled_org_allow_user_opt_out():
    ctx = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True},
        "user_settings": {"opt_in_skill_preserving": False}
    }
    decision = route(ctx)
    assert decision.mode == "baseline"
    assert "user_opt_out" in decision.reasons

def test_route_success():
    ctx = {
        "feature_flags": {"SKILL_PRESERVING_MODE": True},
        "org_policy": {"allow_skill_preserving": True},
        "user_settings": {"opt_in_skill_preserving": True}
    }
    decision = route(ctx)
    assert decision.mode == "skill_preserving"
    assert "flag_on" in decision.reasons

def test_route_request():
    req = {"preferred_provider": "azure-foundry", "model": "gpt-4"}
    dec = route_request(req, {})
    assert dec.provider_id == "azure-foundry"
    assert dec.reason == "user_preference"

def test_route_request_model_implication():
    req = {"model": "azure-gpt-4"}
    dec = route_request(req, {})
    assert dec.provider_id == "azure-foundry"
    assert dec.reason == "model_name_implication"

def test_route_request_default():
    req = {"model": "gpt-4"}
    dec = route_request(req, {})
    assert dec.provider_id == "openai"
    assert dec.reason == "default"
