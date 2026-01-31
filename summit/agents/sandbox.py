import os


class SandboxDeny(Exception):
    """Exception raised when an agent tool execution is denied by the sandbox."""
    pass

def sandbox_enabled() -> bool:
    """Checks if the agentic sandbox is enabled via environment variable."""
    return os.getenv("SUMMIT_AGENTIC_SANDBOX", "0") == "1"

def run_tool(tool_name: str, payload: dict) -> dict:
    """
    Executes a tool in a sandboxed environment.
    Currently a stub that enforces sandbox enablement and allowlist checks.
    """
    if not sandbox_enabled():
        raise SandboxDeny("Agentic sandbox disabled by default. Enable with SUMMIT_AGENTIC_SANDBOX=1")

    # Placeholder for allowlist and execution logic
    allowlist = ["git", "fs", "analysis"]
    if tool_name not in allowlist:
        raise SandboxDeny(f"Tool '{tool_name}' is not in the sandbox allowlist.")

    # In a real implementation, this would execute the tool in a constrained environment
    print(f"Executing sandboxed tool: {tool_name}")
    return {"status": "success", "tool": tool_name, "message": "Sandboxed execution stub"}
