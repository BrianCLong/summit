from summit.tools.mcp_bridge import MCPBridge

def test_mcp_drift_detection():
    bridge = MCPBridge()
    tools_v1 = [{"name": "tool1", "type": "function"}]
    tools_v2 = [{"name": "tool1", "type": "function"}, {"name": "tool2", "type": "function"}]

    bridge.load_tools(tools_v1)

    # Same tools -> No drift
    assert bridge.on_tools_list_changed(tools_v1) is False

    # New tool -> Drift
    assert bridge.on_tools_list_changed(tools_v2) is True
