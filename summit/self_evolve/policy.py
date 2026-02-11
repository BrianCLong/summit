from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class EvolutionOperator:
    id: str
    description: str

class EvolutionPolicy:
    def __init__(self):
        self.allowed_operators = set()

    def allow_operator(self, operator_id: str):
        self.allowed_operators.add(operator_id)

    def is_allowed(self, operator_id: str) -> bool:
        # Deny-by-default
        return operator_id in self.allowed_operators
