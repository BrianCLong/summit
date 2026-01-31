from dataclasses import dataclass
from typing import Optional


@dataclass
class Budget:
    max_tokens: int
    max_usd: float
    spent_tokens: int = 0
    spent_usd: float = 0.0
    stop_reason: Optional[str] = None

    def check(self) -> bool:
        if self.stop_reason:
            return False
        if self.spent_tokens >= self.max_tokens:
            self.stop_reason = "BUDGET_CEILING_TOKENS"
            return False
        if self.spent_usd >= self.max_usd:
            self.stop_reason = "BUDGET_CEILING_USD"
            return False
        return True

    def consume(self, tokens: int, usd: float):
        self.spent_tokens += tokens
        self.spent_usd += usd
