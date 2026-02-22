package agent_gates

default allow = false

# Allow if the tool is in the allowlist and no high-risk flags are set
allow {
    input.type == "tool_execution"
    is_allowed_tool(input.tool)
    not is_high_risk(input.tool)
}

# Allow high-risk tools only with explicit human approval
allow {
    input.type == "tool_execution"
    is_allowed_tool(input.tool)
    is_high_risk(input.tool)
    input.context.approval == true
}

is_allowed_tool(tool) {
    allowed_tools = {
        "read_file",
        "list_files",
        "search_code",
        "view_text_website"
    }
    allowed_tools[tool]
}

is_high_risk(tool) {
    high_risk_tools = {
        "execute_command",
        "delete_file",
        "deploy_service"
    }
    high_risk_tools[tool]
}
