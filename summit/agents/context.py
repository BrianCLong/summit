from typing import List, Any, Dict, Optional
from summit.agents.summarize import make_structured_summary, Summary

class ContextManager:
    def __init__(self, max_tokens: int = 8000, recursion_limit: int = 3):
        self.max_tokens = max_tokens
        self.recursion_limit = recursion_limit
        self.recursion_depth = 0
        self.context_chunks: List[str] = []

    def add_chunk(self, chunk: str):
        self.context_chunks.append(chunk)

    def is_exhausted(self) -> bool:
        # Simplified token counting (char len / 4)
        total_len = sum(len(c) for c in self.context_chunks)
        return (total_len / 4) > self.max_tokens

    def summarize_and_recurse(self, state: Dict[str, Any]) -> Optional[Summary]:
        if self.recursion_depth >= self.recursion_limit:
            raise RecursionError("Max recursion depth reached in context summarization")

        summary = make_structured_summary(self.context_chunks, state)
        self.context_chunks = [str(summary.to_dict())]
        self.recursion_depth += 1
        return summary
