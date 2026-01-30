from typing import Dict, Any

def build_response_plan(user_request: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Skill-Preserving Mode (SPM):
    - Ask for user's plan/intent
    - Provide explanations + verification steps
    - Prefer minimal code + checkpoints over full solutions when learning
    """
    return {
        "style": "coach",
        "required_sections": [
            "Clarify goal in user's words",
            "Conceptual explanation",
            "Step-by-step approach",
            "Verification checklist",
            "Minimal code snippet (if needed)"
        ],
        "constraints": {
            "avoid_full_delegation": True
        }
    }
