# Threat Model

This document provides a high-level overview of the project's threat modeling activities.

- Detailed STRIDE analysis: see [THREAT_MODEL_STRIDE.md](./THREAT_MODEL_STRIDE.md).
- CI-generated architecture diagrams are stored in [docs/generated](./generated/) for each release.

![Threat Model Diagram](./generated/threat-model-diagram.png)

Diagrams are produced automatically during continuous integration to capture architecture and data flows relevant to the threat model.

## Multi-Agent Coordination Threats

### Collusion Risks
*   **Risk**: Agents bypassing limits by splitting tasks among themselves to stay under individual thresholds.
*   **Mitigation**: Shared Budgets implemented in `CoordinationBudgetManager` enforce global caps across all participating agents in a coordination context.

### Budget Amplification
*   **Risk**: Recursive delegation creating exponential resource consumption.
*   **Mitigation**: `CoordinationService` validates actions and `budgetManager` tracks aggregate usage. Implicit delegation without tracking is prohibited.

### Prompt Laundering
*   **Risk**: Passing malicious prompts between agents to obfuscate intent.
*   **Mitigation**: All inter-agent communication must occur within a tracked `CoordinationContext`. Audit logs capture the initiator and role of every action.

### Kill-Switch Failure
*   **Risk**: "Zombie" agents continuing to operate after a stop signal.
*   **Mitigation**: `CoordinationService.killCoordination` sets a terminal status. The `MaestroEngine` checks this status before every task execution.
