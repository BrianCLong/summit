from summit_harness.tool_policy import DEFAULT_DENY, ToolPolicy

def test_default_deny_blocks_unknown_tool():
    assert DEFAULT_DENY.can_use("filesystem.write") is False
    assert DEFAULT_DENY.can_use("shell.run") is False

def test_allowlist_allows_only_named_tools():
    p = ToolPolicy(allowed={"filesystem.read", "web.search"})
    assert p.can_use("filesystem.read") is True
    assert p.can_use("web.search") is True
    assert p.can_use("filesystem.write") is False

def test_empty_allowlist_denies_all():
    p = ToolPolicy(allowed=set())
    assert p.can_use("any.tool") is False
