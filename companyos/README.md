# CompanyOS: The Intelligence Layer SDK

**CompanyOS** is the sovereign intelligence layer for the modern enterprise. Unlike closed platforms that require you to replace your operating system, CompanyOS embeds agentic reasoning, knowledge graph intelligence, and governance directly into your existing stack.

## 🧠 Embed Intelligence, Don't Replace It

CompanyOS provides the SDKs and patterns to build:
*   **Agentic Workflows**: Autonomous agents that reason, plan, and execute.
*   **Knowledge Graphs**: GraphRAG-powered insights using Neo4j and GQL.
*   **Sovereign Governance**: Policy-as-code enforcement with full auditability.

## 📦 SDK Entrypoints

The **CompanyOS SDK** is composed of modular packages designed for specific intelligence capabilities:

### 1. @intelgraph/sdk (Core Client)
The foundational client for interacting with the Summit Intelligence Graph.
*   **Use for**: Querying the Knowledge Graph, ingesting data, and managing entities.
*   **Location**: `packages/sdk`

### 2. @intelgraph/maestro-sdk (Agent Orchestration)
The engine for defining and running multi-agent workflows.
*   **Use for**: Defining agent roles, creating task graphs, and orchestrating complex multi-hop reasoning.
*   **Location**: `packages/maestro-sdk`

## Structure

*   **`blueprint/`**: The organizational design and high-level architecture.
*   **`agents/`**: Definitions and system prompts for the Agent Mesh.
*   **`workflows/`**: Maestro Task Graph templates for standard flows.
*   **`governance/`**: Integration of the Governance Layer into the mesh.
*   **`backlog/`**: Initial backlog and sprint plans (Sprint 0-3).
*   **`toolchain/`**: Specifications for tool interoperability.

## Quick Start (Sprint 0)

1.  **Review the Blueprint**: Start with `blueprint/overview.md` to understand the org structure.
2.  **Spin up Agents**: Use the prompts in `agents/definitions.md` to instantiate the agent mesh.
3.  **Deploy Governance**: Apply the principles in `governance/integration.md`.
4.  **Execute Sprint 0**: Follow the stories in `backlog/sprint-plan.md`.

## Mission Lock

**WARNING**: This system is mission-locked. All modifications must adhere to the governance charter.
No actions may be taken that weaken civil society, support authoritarianism, or violate the ethical guardrails defined in `governance/`.
