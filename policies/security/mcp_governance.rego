package security.mcp
import future.keywords.in


default allow := false

# Security Signal: Block insecure MCP server configurations
# Reference: TechRadar - "Anthropic’s official Git MCP server had some worrying security flaws"

# Rule: All MCP connections must use TLS
secure_transport {
    input.connection.tls == true
}

# Rule: Prevent Path Traversal in Filesystem MCP
# Blocks paths containing ".." or outside allowlist
safe_filesystem_access {
    input.tool == "filesystem"
    not contains(input.args.path, "..")
    startswith(input.args.path, "/data/sandbox/")
}

# Rule: Prevent Dangerous Git Commands (init, unexpected hooks)
# Specifically addresses the "git_init bypass" vulnerability
safe_git_usage {
    input.tool == "git"
    allowed_commands := {"status", "diff", "log", "show"}
    input.args.command in allowed_commands
}

# Rule: Whitelist Safe Tools
safe_tool_usage {
    input.tool in {"weather", "calculator", "time"}
}

# Primary Authorization Logic
allow {
    input.protocol == "mcp"
    secure_transport
    safe_filesystem_access
}

allow {
    input.protocol == "mcp"
    secure_transport
    safe_git_usage
}

allow {
    input.protocol == "mcp"
    secure_transport
    safe_tool_usage
}
