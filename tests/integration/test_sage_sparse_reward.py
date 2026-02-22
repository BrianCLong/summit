import pytest
import sys
import os

# Ensure summit is in path
sys.path.append(os.getcwd())

from summit.rl.config.sage import SAGEConfig
from summit.rl.rollouts.sage_wrapper import SageRolloutWrapper
from summit.rl.hints.from_reference import ReferenceHintGenerator
from summit.rl.metrics.diversity import calculate_mixed_outcome_rate

def mock_rollout_fn(prompts, references=None, mode="train", original_prompts=None, **kwargs):
    results = []
    for prompt in prompts:
        # Mock model behavior:
        # If hint is present and useful, it succeeds.
        if "Hint: Solution" in prompt:
            results.append("The Solution is 42")
        else:
            results.append("I do not know the answer")
    return results

def test_sage_injection_and_outcome():
    # Setup
    config = SAGEConfig(enabled=True, hint_levels=[1])
    generator = ReferenceHintGenerator()

    wrapper = SageRolloutWrapper(
        rollout_fn=mock_rollout_fn,
        config=config,
        hint_generator=generator
    )

    prompts = ["What is the answer?"]
    references = ["Solution is 42"]

    # 1. Run with SAGE (Train mode)
    # Hint generator should extract "Solution is 42..." from reference
    # Wrapper should inject "Hint: Solution is 42..."
    results_train = wrapper(prompts, references=references, mode="train", seed=1)

    # Expect success because hint was injected
    assert results_train[0] == "The Solution is 42", f"Expected success with hint, got: {results_train[0]}"

    # 2. Run without SAGE (Inference mode)
    results_infer = wrapper(prompts, references=references, mode="inference", seed=1)

    # Expect failure because no hint
    assert results_infer[0] == "I do not know the answer", f"Expected failure without hint, got: {results_infer[0]}"

    # 3. Verify Metrics
    rewards_train = [1.0 if "42" in r else 0.0 for r in results_train]
    rewards_infer = [1.0 if "42" in r else 0.0 for r in results_infer]

    assert sum(rewards_train) > sum(rewards_infer)

def test_config_disable():
    config = SAGEConfig(enabled=False) # Globally disabled
    generator = ReferenceHintGenerator()
    wrapper = SageRolloutWrapper(mock_rollout_fn, config, generator)

    prompts = ["What is the answer?"]
    references = ["Solution is 42"]

    results = wrapper(prompts, references=references, mode="train")
    assert results[0] == "I do not know the answer"

if __name__ == "__main__":
    # Allow running directly
    test_sage_injection_and_outcome()
    test_config_disable()
    print("All SAGE tests passed!")
