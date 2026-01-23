from enum import Enum


class BudgetPolicyType(str, Enum):
    HARD = "hard"
    SOFT = "soft"

    def __str__(self) -> str:
        return str(self.value)
