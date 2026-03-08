from typing import Any, Dict


class ApplyPatchTool:
    def get_definition(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": "apply_patch",
                "description": "Apply a patch to a file using the unified diff format.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "The file path to apply patch to."},
                        "diff": {"type": "string", "description": "The unified diff content."}
                    },
                    "required": ["path", "diff"]
                }
            }
        }

    def execute(self, path: str, diff: str) -> str:
        return f"STUB: Applied patch to {path}"
