from ig_rl.reward.hub import RewardHub


def test_reward_registration_and_evaluation():
    hub = RewardHub({"time_to_insight": 0.5, "accuracy": 0.3, "cost": 0.2})
    hub.register("custom", {"time_to_insight": 0.6, "accuracy": 0.4})

    observation = hub.evaluate("custom", {"time_to_insight": 1.0, "accuracy": 0.5})
    assert round(observation.reward, 4) == round(0.6 * 1.0 + 0.4 * 0.5, 4)
    assert observation.components["time_to_insight"] == 0.6
    assert observation.components["accuracy"] == 0.2


def test_reward_normalization_rejects_empty():
    hub = RewardHub({"metric": 1.0})
    try:
        hub.register("invalid", {})
    except ValueError:
        pass
    else:
        raise AssertionError("Expected ValueError for empty weights")
