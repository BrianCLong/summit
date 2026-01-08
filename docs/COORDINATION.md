# Coordination Model

This document defines the canonical coordination model for multi-agent systems in Summit.

## Roles

- **COORDINATOR**: The agent responsible for decomposing the high-level goal and delegating tasks.
- **WORKER**: An agent that executes a specific task and reports back.
- **REVIEWER**: An agent that validates the output of a Worker.

## Schema Versioning

Current Version: `v1.0`

### Allowed Transitions

1.  Coordinator -> Worker (Task Delegation)
2.  Worker -> Reviewer (Request for Review)
3.  Reviewer -> Coordinator (Validation Result)

## Shared Budgets

All coordinated runs must have a `SharedBudget` that caps:

1.  **Total Steps**: The aggregate number of tasks executed.
2.  **Total Tokens**: The aggregate LLM tokens consumed.
3.  **Wall Clock Time**: The maximum duration of the coordination.

Budgets are enforced by `CoordinationBudgetManager`.

## Kill Switch

A global kill-switch is available via `CoordinationService.killCoordination(id, reason)`. This:

1.  Sets the coordination status to `TERMINATED`.
2.  Prevents any further tasks from starting via `MaestroEngine`.
3.  Logs a structured audit event.
