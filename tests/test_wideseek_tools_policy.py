import pytest
from summit.tools.wideseek import SearchTool, AccessTool, WideSeekPolicy

def test_policy_allowlist():
    policy = WideSeekPolicy(allowlist={"example.com"})
    assert policy.check_url("https://example.com/foo") is True
    assert policy.check_url("https://malicious.com") is False

def test_search_tool_filtering():
    policy = WideSeekPolicy(allowlist={"example.com"})
    search = SearchTool(policy)

    # Inject mock result that should be blocked
    search.mock_results["test"] = [
        {"url": "https://example.com/good", "title": "Good"},
        {"url": "https://bad.com/bad", "title": "Bad"}
    ]

    results = search.search("test")
    assert len(results) == 1
    assert results[0]["url"] == "https://example.com/good"

def test_access_tool_denial():
    policy = WideSeekPolicy(allowlist={"example.com"})
    access = AccessTool(policy)

    result = access.access("https://bad.com")
    assert "denied" in result.lower()
