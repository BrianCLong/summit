# IntelGraph Fusion Engine v1 Architecture

## Overview
IntelGraph is the semantic backbone of the platform, storing entities and relationships to provide a unified view of the system's state and history.

## Data Model (v1)

### Nodes
- **Tenant**: Represents a customer or organizational unit.
- **Task**: Represents a unit of work managed by Maestro.
- **Incident**: Represents a security event group from Securiteyes.
- **GovernanceDecision**: Records the outcome of a policy evaluation.

### Edges
- **TASK_OF_TENANT**: Links a Task to its Tenant.
- **GOV_DECISION_FOR_TASK**: Links a Decision to the Task it evaluated.
- **LINKED_EVENT**: Links raw events to Incidents or Tasks.

## Persistence
- **GraphPersistenceAdapter**: Interface for storage backends.
- **InMemoryGraphAdapter**: Implementation for v1/Testing (ephemeral).

## Integration
- **Maestro**: Records task lifecycle and governance decisions.
- **Securiteyes**: Records incidents and correlated events.
