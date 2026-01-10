# Guardrail: budget_enforcer

Enforces evaluator-specified compute budgets for runtime and memory.

## Enforcement

- Terminates runs exceeding budgets.
- Records budget breaches in proof objects and egress receipts.
- Emits transparency log events on termination.
