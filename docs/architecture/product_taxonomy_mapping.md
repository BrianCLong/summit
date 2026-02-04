# Summit Product Taxonomy Mapping

This document maps the current codebase structure to the [Summit Product Taxonomy](./product_taxonomy.md) (SDK, Runtime, Harness).

## 1. Summit SDK (Framework)

*Abstraction layer for building agents.*

*   **`packages/sdk`**: Core SDK libraries.
*   **`packages/maestro-sdk`**: SDK for building Maestro-compatible components.
*   **`packages/plugin-sdk`**: Standard interface for plugin development.
*   **`packages/recursive-context-runtime`**: RCR library for managing large context windows recursively.
*   **`packages/maestro-skills`**: Collection of pre-built skills (tools) for agents.
*   **`packages/agent-gateway`**: Middleware and gateway components for agent communication.

## 2. Summit Runtime (Runtime)

*Production infrastructure for execution, state, and governance.*

*   **`server` (`intelgraph-server`)**: The primary durable execution backend, API gateway, and persistence layer.
*   **`packages/maestro-core`**: Core orchestration logic for workflows.
*   **`packages/policy-engine`**: Governance and policy enforcement (OPA integration).
*   **`packages/provenance`**: Provenance tracking and evidence generation.
*   **`packages/prov-ledger`**: Immutable ledger for provenance data.
*   **`runtime/`**: Runtime configuration and policy definitions.

## 3. Summit Harness (Harness)

*End-to-end "Deep Agent" system.*

*   **`deepagent-mvp`**: Reference implementation of a complete Deep Agent system (Thinking + Tooling + Memory).
*   **`maestro`**: Python-based orchestration harness (likely for data-intensive or research workflows).
*   **`apps/web`**: User interface for interacting with the harness and runtime.
*   **`packages/workspace`**: Management of persistent agent workspaces (files, state).
*   **`packages/sim-harness`**: Simulation environment for testing agent behaviors.
