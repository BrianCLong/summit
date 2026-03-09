from typing import Dict, Any

class UpdatePlanTool:
    def get_definition(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": "update_plan",
                "description": "Update the current plan.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "plan": {"type": "string", "description": "The new plan content in Markdown."}
                    },
                    "required": ["plan"]
                }
            }
        }

    def execute(self, plan: str) -> str:
        return "STUB: Plan updated"
