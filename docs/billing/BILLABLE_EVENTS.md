# Billable Events & Units

This document defines the canonical list of billable events and their units for the Summit platform.
All billing is authoritative, idempotent, and backed by immutable evidence in the Provenance Ledger.

## 1. Billable Events

| Event Code                 | Description                                               | Unit                | Rounding | Exclusions                                 |
| :------------------------- | :-------------------------------------------------------- | :------------------ | :------- | :----------------------------------------- |
| `read_query`               | A read-only query to the knowledge graph or search index. | `query`             | None     | Internal health checks, caching refreshes. |
| `planning_run`             | A standard Maestro orchestration run.                     | `run`               | None     | Failed system runs (internal errors).      |
| `evaluation_run`           | A self-test or evaluation run.                            | `run`               | None     | -                                          |
| `write_action`             | An approved mutation or write action to the graph.        | `action`            | None     | Rollbacks, compensating transactions.      |
| `multi_agent_coordination` | A complex coordination event involving multiple agents.   | `coordination_step` | None     | -                                          |
| `plugin_invocation`        | Execution of an external plugin or tool.                  | `invocation`        | None     | -                                          |

## 2. Units

- **query**: A single request-response cycle for data retrieval.
- **run**: A complete execution lifecycle of a workflow or plan.
- **action**: A state-changing operation.
- **coordination_step**: A discrete step in a multi-agent protocol.
- **invocation**: A call to an external system.
- **token**: LLM token usage (input + output).
- **minute**: Compute time duration.

## 3. Rules

- **Idempotency**: All events must be submitted with a unique `idempotencyKey`. Duplicate submissions will be rejected or return the original receipt without double-counting.
- **Immutability**: Once recorded, a billable event cannot be modified. Adjustments must be made via explicit `credit_adjustment` events.
- **Evidence**: Every billable event is linked to a Provenance Ledger entry.

## 4. Owners

- **Revenue Operations**: [Contact Info]
- **Engineering Lead**: Jules

## 5. Exclusions

- **Free Tier**: Tenants on 'FREE' tier have a cap of 0 billable events for paid features, or specific quotas defined in QuotaManager.
- **Trial**: 'TRIAL' tenants are metered but not billed up to a specific limit.
