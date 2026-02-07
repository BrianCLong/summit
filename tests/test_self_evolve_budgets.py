from summit.self_evolve.policy import EvolutionPolicy

def test_evolution_budget_enforced():
    policy = EvolutionPolicy()

    # Within budget
    assert policy.validate_evolution_step(step_count=0, tokens_added=100) is True
    assert policy.validate_evolution_step(step_count=2, tokens_added=2000) is True

    # Exceed steps
    assert policy.validate_evolution_step(step_count=3, tokens_added=100) is False

    # Exceed tokens
    assert policy.validate_evolution_step(step_count=1, tokens_added=2001) is False
