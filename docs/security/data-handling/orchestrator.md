# Orchestrator Data Handling & Security

## Principles
- **Deny-by-Default**: Data flow between agents is prohibited unless explicitly allowed in the policy.
- **Traceability**: All agent interactions are logged in a deterministic trace.
- **Isolation**: Agents are isolated by role and capability.

## Never-Log
- API keys
- Agent system prompts (unless sanitized)
- Raw tool secrets

## Retention
- Execution traces: 30 days
- Metrics: 90 days
