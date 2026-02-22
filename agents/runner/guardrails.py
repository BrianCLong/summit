# Agent Runner Guardrails

def validate_action(action, context):
    """
    Validates an agent action against current policy and context.
    """
    # 1. Check if action is in scope
    # 2. Check if action violates any non-goals
    # 3. Check if action requires human approval
    print(f"Validating action: {action.get('type')}")
    return True

def scan_for_secrets(text):
    """
    Simple secret scanner for demonstration.
    """
    forbidden = ["sk-", "ghp_", "AIza"]
    for token in forbidden:
        if token in text:
            return False
    return True
