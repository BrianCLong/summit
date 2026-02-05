from summit.frontier.iam.identity import AgentIdentity
from summit.frontier.iam.policy import DenyByDefaultPolicy
from dataclasses import dataclass

@dataclass
class MockContext:
    user_id: str

def test_deny_by_default():
    identity = AgentIdentity(id="agent-001", allowed_tools=["read_file"])
    policy = DenyByDefaultPolicy(identity)

    ctx = MockContext(user_id="user1")

    # Allowed tool
    assert policy.check_tool_call("read_file", {"path": "foo"}, ctx) is True

    # Denied tool (not in list)
    assert policy.check_tool_call("write_file", {"path": "foo"}, ctx) is False

def test_context_aware_policy():
    identity = AgentIdentity(id="agent-002", allowed_tools=["delete_file"])
    policy = DenyByDefaultPolicy(identity)

    # Guest user denied
    ctx_guest = MockContext(user_id="guest")
    assert policy.check_tool_call("delete_file", {}, ctx_guest) is False

    # Other user allowed
    ctx_admin = MockContext(user_id="admin")
    assert policy.check_tool_call("delete_file", {}, ctx_admin) is True
