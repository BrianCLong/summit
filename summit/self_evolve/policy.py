import os

class EvolutionPolicy:
    def __init__(self, allowed_operators=None):
        # Deny-by-default: only explicitly allowed operators can run
        self.allowed_operators = set(allowed_operators or [])

    def is_allowed(self, operator_name: str) -> bool:
        return operator_name in self.allowed_operators

    def allow_operator(self, operator_name: str):
        self.allowed_operators.add(operator_name)

    def deny_operator(self, operator_name: str):
        self.allowed_operators.discard(operator_name)
