# Autonomy Budgets

Prevents unbounded agent loops.

## Defaults
- Max steps: 20
- Max tool calls: 5
- Max messages: 50

## Enforcement
Exceeding the budget raises `RuntimeError` and halts execution.
