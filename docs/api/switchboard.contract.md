# Switchboard Contract (v1 foundation)

## Enforcement checkpoint
Before each flow run or tool invocation, Switchboard evaluates companyOS policy.

## Actions
- `FLOW_RUN`
- `TOOL_INVOKE`

## Required behavior
- Deny path: reject execution and emit policy evidence.
- Allow path: continue execution and emit policy evidence.

## Runtime gate
`COMPANYOS_ENFORCE` controls enforcement rollout in v1.
