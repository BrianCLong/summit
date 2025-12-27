# Threat Model

This document provides a high-level overview of the project's threat modeling activities.

- Detailed STRIDE analysis: see [THREAT_MODEL_STRIDE.md](./THREAT_MODEL_STRIDE.md).
- Detailed Threat Matrix: see [THREAT_MATRIX.md](./THREAT_MATRIX.md).
- CI-generated architecture diagrams are stored in [docs/generated](./generated/) for each release.

![Threat Model Diagram](./generated/threat-model-diagram.png)

## Scope
This threat model covers:
1.  **Agents**: Autonomous actors within the system.
2.  **Policies**: Rules governing agent and user behavior.
3.  **Extensions**: Third-party or auxiliary modules.
4.  **Data Inputs**: Ingestion pipelines and user inputs.
5.  **Observability/Logging**: The monitoring plane itself.

## Threat Classes

### Abuse
Misuse of features by authorized users or agents to degrade system performance or violate intent (e.g., resource hogging, spamming).

### Escalation
Gaining higher privileges than authorized (e.g., standard user accessing admin functions, agent modifying its own permissions).

### Data Poisoning
Injecting malicious or false data to corrupt analytics, search results, or model training (e.g., graph injection, fake evidence).

### Hallucinated Authority
Agents or components acting on false beliefs of permission or capability (e.g., an agent "thinking" it can deploy code when it cannot).

### Silent Failure
Failures that occur without triggering alerts or visible errors, leading to "zombie" states or partial data corruption.

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
