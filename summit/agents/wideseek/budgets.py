from dataclasses import dataclass

@dataclass
class WideSeekBudgets:
    max_turns: int = 5
    max_subagents: int = 3
    max_tool_calls: int = 20
    max_tokens: int = 4096
    max_duration_seconds: int = 30
