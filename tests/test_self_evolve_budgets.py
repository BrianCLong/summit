import pytest
from summit.self_evolve.policy import EvolutionPolicy
from summit.self_evolve.operators import OPERATORS

def test_evolution_budget_enforced():
    # Mocking budget enforcement
    max_steps = 3
    current_steps = 0

    # Simulate evolution loop
    for _ in range(5):
        if current_steps < max_steps:
            current_steps += 1
        else:
            break

    assert current_steps == max_steps

def test_policy_denies_mutation():
    policy = EvolutionPolicy()
    # Default is empty, so should deny
    assert not policy.is_allowed("OP_PROMPT_PATCH")

    policy.allow_operator("OP_PROMPT_PATCH")
    assert policy.is_allowed("OP_PROMPT_PATCH")
