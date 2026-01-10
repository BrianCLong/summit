# Budget Enforcer

## Purpose

Enforces disclosure and sensitivity budgets for MC tool executions.

## Enforcement Rules

- Validate budget ID and policy version before execution.
- Track consumption by bytes, entity count, and sensitivity class.
- Redact or truncate outputs when budgets are exceeded.

## Audit Hooks

- Emit witness records for each enforcement decision.
- Log budget usage metrics for observability.
