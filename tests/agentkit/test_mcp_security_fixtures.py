import pytest
from summit.agentkit.tools.adapters.mcp_stub import MCPAdapter

def test_mcp_path_traversal_blocked():
    """Ensure MCP adapter is disabled by default to prevent path traversal risks."""
    adapter = MCPAdapter(server_url="http://localhost:8080")
    # Even a 'safe' looking tool should fail because the adapter is disabled.
    with pytest.raises(NotImplementedError, match="MCPAdapter disabled"):
        adapter.invoke("read_file", {"path": "../../../etc/passwd"})

def test_mcp_arg_injection_blocked():
    adapter = MCPAdapter(server_url="http://localhost:8080")
    with pytest.raises(NotImplementedError, match="MCPAdapter disabled"):
        adapter.invoke("git_checkout", {"branch": "; rm -rf /"})
