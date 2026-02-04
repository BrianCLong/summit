from dataclasses import dataclass


@dataclass(frozen=True)
class AutonomyBudget:
  max_steps: int = 20
  max_tool_calls: int = 5
  max_messages: int = 50

def enforce_budget(step: int, tool_calls: int, messages: int, budget: AutonomyBudget) -> None:
  if step > budget.max_steps:
    raise RuntimeError("AUTONOMY_BUDGET_EXCEEDED: steps")
  if tool_calls > budget.max_tool_calls:
    raise RuntimeError("AUTONOMY_BUDGET_EXCEEDED: tool_calls")
  if messages > budget.max_messages:
    raise RuntimeError("AUTONOMY_BUDGET_EXCEEDED: messages")
