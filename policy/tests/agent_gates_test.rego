package agent_gates

test_allow_read_file {
    allow with input as {
        "type": "tool_execution",
        "tool": "read_file",
        "context": {}
    }
}

test_deny_unknown_tool {
    not allow with input as {
        "type": "tool_execution",
        "tool": "unknown_tool",
        "context": {}
    }
}

test_deny_high_risk_without_approval {
    not allow with input as {
        "type": "tool_execution",
        "tool": "execute_command",
        "context": {
            "approval": false
        }
    }
}

test_allow_high_risk_with_approval {
    allow with input as {
        "type": "tool_execution",
        "tool": "execute_command",
        "context": {
            "approval": true
        }
    }
}
