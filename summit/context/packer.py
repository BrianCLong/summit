from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ContextItem:
    content: str
    tokens: int
    score: float
    source: str

class ContextPacker:
    def __init__(self, max_tokens: int):
        self.max_tokens = max_tokens

    def pack(self, items: List[ContextItem]) -> List[ContextItem]:
        # Sort by score descending (greedy knapsack)
        # Stable sort for determinism on equal scores
        sorted_items = sorted(items, key=lambda x: (x.score, x.source), reverse=True)

        packed = []
        current_tokens = 0

        for item in sorted_items:
            if current_tokens + item.tokens <= self.max_tokens:
                packed.append(item)
                current_tokens += item.tokens

        return packed

    def get_metrics(self, items: List[ContextItem], packed: List[ContextItem]) -> Dict[str, Any]:
        total_tokens_in = sum(i.tokens for i in items)
        total_tokens_out = sum(i.tokens for i in packed)
        dropped = len(items) - len(packed)

        return {
            "max_tokens": self.max_tokens,
            "input_items": len(items),
            "packed_items": len(packed),
            "input_tokens": total_tokens_in,
            "packed_tokens": total_tokens_out,
            "utilization": round(total_tokens_out / self.max_tokens, 4) if self.max_tokens > 0 else 0,
            "dropped_items": dropped
        }
