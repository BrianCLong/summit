from summit.brand_story.policy import check_policy

def test_policy_allowed():
    plan = {"episodes": [{"title": "Safe"}]}
    assert check_policy(plan)["allowed"] is True

def test_policy_denied():
    plan = {"episodes": [{"title": "Fraud and accuse"}]}
    assert check_policy(plan)["allowed"] is False
