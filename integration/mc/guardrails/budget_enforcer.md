# Budget Enforcer Guardrail

## Rule

All tool executions must honor budget contracts (latency, expansions, egress, privacy).

## Enforcement

- Attach budget contract ID to each tool invocation.
- Abort execution when budget exceeds limits.
- Record budget usage in witness chain and audit ledger.
