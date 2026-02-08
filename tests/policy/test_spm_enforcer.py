import pytest
from summit.policy.router import PolicyDecision
from summit.policy.spm_enforcer import SPMEnforcer

def test_spm_enforcer_baseline():
    enforcer = SPMEnforcer()
    decision = PolicyDecision(policy_id="POL-BASELINE", mode="baseline")
    augmentations = enforcer.get_prompt_augmentations(decision)
    assert augmentations == []

def test_spm_enforcer_active():
    enforcer = SPMEnforcer()
    decision = PolicyDecision(policy_id="POL-SKILL-PRESERVE", mode="skill_preserving")
    augmentations = enforcer.get_prompt_augmentations(decision)
    assert len(augmentations) == 2
    assert "ask the user for their proposed plan" in augmentations[0]
    assert "Explain the 'why'" in augmentations[1]

def test_wrap_system_prompt_baseline():
    enforcer = SPMEnforcer()
    decision = PolicyDecision(policy_id="POL-BASELINE", mode="baseline")
    prompt = "Hello AI"
    wrapped = enforcer.wrap_system_prompt(prompt, decision)
    assert wrapped == prompt

def test_wrap_system_prompt_active():
    enforcer = SPMEnforcer()
    decision = PolicyDecision(policy_id="POL-SKILL-PRESERVE", mode="skill_preserving")
    prompt = "Hello AI"
    wrapped = enforcer.wrap_system_prompt(prompt, decision)
    assert "=== SKILL PRESERVING MODE ENABLED ===" in wrapped
    assert "Hello AI" in wrapped
    assert "ask the user for their proposed plan" in wrapped
