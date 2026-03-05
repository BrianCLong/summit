import shlex
from typing import Any, Dict


class ShellTool:
    def __init__(self):
        pass

    def get_definition(self) -> dict[str, Any]:
         return {
            "type": "function",
            "function": {
                "name": "shell",
                "description": "Execute a shell command",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "The command to run"}
                    },
                    "required": ["command"]
                }
            }
        }

    def requires_approval(self, command: str) -> bool:
        """
        Determines if a command requires human approval.
        Policy: Only harmless read-only commands are allowed without approval.
        """
        try:
            parts = shlex.split(command)
            if not parts:
                return False
            cmd = parts[0]
            # Simple allowlist for demonstration/testing
            if cmd in ["echo", "ls", "pwd", "cat", "grep", "find"]:
                return False
            return True
        except:
            return True

    def execute(self, command: str, approved: bool = False) -> str:
        """
        Executes the command if allowed.
        """
        if self.requires_approval(command) and not approved:
            raise PermissionError(f"Command requires approval: {command}")

        # Stub execution
        return f"STUB: Executed {command}"
