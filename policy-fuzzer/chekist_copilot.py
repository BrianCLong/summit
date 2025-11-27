"""
ChekistCopilot: Aggressive policy fuzzing agent.
"""
from policy_generator import generate_policy
from query_generator import generate_query

class ChekistCopilot:
    """
    A specialized agent that generates aggressive policy/query pairs
    designed to bypass standard governance checks.
    """
    def __init__(self):
        pass

    def get_aggressive_policy(self):
        """Returns a policy with complex, potentially conflicting rules."""
        # For now, wrap standard generator. In future, add mutation logic.
        return generate_policy()

    def get_aggressive_query(self, args):
        """Returns a query with boundary values and injection attempts."""
        # For now, wrap standard generator.
        return generate_query(args)
