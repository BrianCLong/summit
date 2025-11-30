# Maestro Conductor v1 Architecture

## Overview
Maestro Conductor v1 is the central orchestration engine for the platform. It manages the lifecycle of Tasks, dispatches them to appropriate Runners, and enforces Governance policies before execution.

## Components

### Task Orchestrator
- **Responsibility**: Creates tasks, manages state, dispatches to runners.
- **Key Methods**:
  - `createTask(tenantId, type, input, riskCategory)`: Creates a task and performs a governance check.
  - `dispatch(taskId)`: Finds a runner and executes the task.

### Runners
Pluggable execution units.
- **ArchitectureDesignRunner**: Generates system architecture diagrams (mock).
- **TenantOnboardingRunner**: Handles tenant provisioning.
- **IncidentResponseRunner**: Defensive automated response actions.

### Event Bus
Emits typed events (`TASK_CREATED`, `TASK_STARTED`, `TASK_COMPLETED`, `TASK_BLOCKED`) for downstream consumers like Summitsight (metrics) and IntelGraph (provenance).

## Governance Integration
Every task creation triggers a `evaluateGovernancePolicy` call. If the risk category is disallowed (e.g., `influence_operations`), the task is immediately transitioned to `BLOCKED_BY_GOVERNANCE` state.
