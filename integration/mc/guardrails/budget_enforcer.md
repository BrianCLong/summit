# Budget Enforcer

## Objective

Ensure compute, evidence, and egress budgets are respected before execution.

## Enforced Budgets

- Max edges processed
- Max runtime or memory
- Evidence count / proof size
- Egress bytes

## Workflow

1. Retrieve budget profile from policy gateway.
2. Reject requests that exceed budget.
3. Emit budget receipt with allowed limits.
