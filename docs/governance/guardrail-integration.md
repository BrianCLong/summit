# Guardrail Integration

## Architecture
The Governance Kernel is integrated as a synchronous blocking gate in critical system paths.

## Enforcement Points

1. **Maestro Task Creation**: Before a task is persisted or dispatched, `evaluateGovernancePolicy` is called. If denied, the task enters `BLOCKED_BY_GOVERNANCE` state.
2. **Tenant Onboarding**: New tenants must be approved by policy before creation.
3. **Incident Escalation**: Securiteyes checks policy before creating high-severity incidents to prevent automated over-reaction.

## implementation
The kernel provides a stateless `evaluateGovernancePolicy` function that returns a `GovernanceDecision` object (ALLOWED/CONDITIONAL/DENIED). This object is persisted in IntelGraph for auditability.
