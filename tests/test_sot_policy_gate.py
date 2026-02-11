import pytest

from summit.orchestration.policy.sot_policy import SocietyOfThoughtPolicy


def test_policy_success():
    policy = SocietyOfThoughtPolicy(min_challenges=2)
    debate = [
        {"persona": "Planner", "text": "Plan A"},
        {"persona": "CriticalVerifier", "text": "- Point 1 is weak\n- Point 2 is missing"},
        {"persona": "Reconciler", "text": "Resolved the critique by adding missing points."}
    ]
    policy.assert_ok(debate, "task", {}) # Should not raise

def test_policy_fail_sycophancy():
    policy = SocietyOfThoughtPolicy(min_challenges=2)
    debate = [
        {"persona": "Planner", "text": "Plan A"},
        {"persona": "CriticalVerifier", "text": "I agree with Plan A. It's great."}, # No challenges
        {"persona": "Reconciler", "text": "Plan A is final."}
    ]
    with pytest.raises(ValueError, match="Sycophancy detected"):
        policy.assert_ok(debate, "task", {})

def test_policy_fail_reconciler_ignores_critic():
    policy = SocietyOfThoughtPolicy(min_challenges=2)
    debate = [
        {"persona": "Planner", "text": "Plan A"},
        {"persona": "CriticalVerifier", "text": "- Challenge 1\n- Challenge 2"},
        {"persona": "Reconciler", "text": "I chose Plan A because I like it."} # Ignores critique
    ]
    with pytest.raises(ValueError, match="Audit failure: Reconciler did not address critic"):
        policy.assert_ok(debate, "task", {})

def test_policy_success_with_falsification_attempt():
    policy = SocietyOfThoughtPolicy(min_challenges=2)
    debate = [
        {"persona": "Planner", "text": "Plan A"},
        {"persona": "CriticalVerifier", "text": "I agree with Plan A. Falsification attempt: tried to find counterexample X but it was invalid."},
        {"persona": "Reconciler", "text": "Critic confirmed Plan A after falsification attempt."}
    ]
    policy.assert_ok(debate, "task", {}) # Should pass despite low challenge count
