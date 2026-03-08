from summit_harness.tool_policy import DEFAULT_DENY, ToolPolicy


def test_default_deny_blocks_unknown_tool():
    assert DEFAULT_DENY.can_use("filesystem.write") is False

def test_allowlist_allows_only_named_tools():
    p = ToolPolicy(allowed={"filesystem.read"})
    assert p.can_use("filesystem.read") is True
    assert p.can_use("filesystem.write") is False
