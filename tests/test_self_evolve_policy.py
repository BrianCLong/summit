import pytest
from summit.self_evolve.policy import EvolutionPolicy
from summit.self_evolve.operators import registry

def test_policy_denies_unauthorized_operator():
    policy = EvolutionPolicy(allowed_operators={"OP_PROMPT_PATCH"})
    assert policy.is_operator_allowed("OP_PROMPT_PATCH") is True
    assert policy.is_operator_allowed("OP_TOOL_POLICY_PATCH") is False

def test_policy_authorize_mutation():
    policy = EvolutionPolicy(allowed_operators={"OP_PROMPT_PATCH", "OP_TOOL_POLICY_PATCH"})

    # Authorized
    assert policy.authorize_mutation("OP_PROMPT_PATCH", {"diff": "something"}) is True

    # Denied (no diff)
    assert policy.authorize_mutation("OP_PROMPT_PATCH", {}) is False

    # Denied (tool removal)
    assert policy.authorize_mutation("OP_TOOL_POLICY_PATCH", {"remove": "tool1"}) is False

    # Authorized (tool add)
    assert policy.authorize_mutation("OP_TOOL_POLICY_PATCH", {"add": "tool2"}) is True

def test_operator_registry():
    op = registry.get("OP_PROMPT_PATCH")
    assert op.name == "OP_PROMPT_PATCH"
    with pytest.raises(ValueError):
        registry.get("UNKNOWN_OP")
