import os

import yaml


def test_agent_tools_deny_by_default():
    policy_path = os.path.join(os.path.dirname(__file__), "..", "policies", "agent_tools_deny_by_default.yaml")

    with open(policy_path) as f:
        policy = yaml.safe_load(f)

    assert policy["default_policy"] == "deny"

    npm_tool = next((t for t in policy["tools"] if t["name"] == "npm install"), None)
    assert npm_tool is not None
    assert npm_tool["action"] == "deny"
    assert npm_tool["requires_explicit_approval"] is True
