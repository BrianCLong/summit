# ADR 007: Knowledge Graph Schema

## Status
Accepted

## Context
Summit requires a structured orchestration engine to route requests based on an enterprise graph rather than simple prompt text. To construct policy-trimmed, token-budgeted `GraphContextPackage`s for the LLM router and planner, we need a canonical graph schema modeling tasks, agents, capabilities, tools, datasets, policies, and their relationships.

## Decision
The core Knowledge Graph schema will implement the following entity types and relationships, indexed using Neo4j:

### Entities:
- **Task:** Represents a goal-oriented unit of work (`id`, `type`, `goal`, `capabilities`, `riskBudget`).
- **Agent:** The reasoning engine or worker assigned to execute tasks (`id`, `capabilities`, `tools`, `datasets`, `riskLevel`).
- **Capability:** A discrete function an agent can perform (`id`, `description`, `requiredTools`).
- **Tool:** A technical interface or action (`id`, `allowedDatasets`, `riskLevel`).
- **Dataset:** A corpus of information accessed during execution (`id`, `classification`, `owner`).
- **Policy:** Governance constraints (`id`, `scope`, `rules`).
- **ApprovalRole:** An entity capable of authorizing tasks (`id`, `authorisedCapabilities`).
- **Workflow:** An orchestrated sequence of tasks (`id`, `steps`).
- **EvidenceArtifact:** Verifiable provenance outputs (`id`, `type`, `files`).
- **Incident:** Records of unexpected behavior or violations (`id`, `affectedEntities`, `severity`).
- **Outcome:** Historical execution metrics (`agentId`, `taskType`, `successRate`, `latencyP50ms`).

### Edges (Relationships):
- `Task REQUIRES Capability`
- `Agent PROVIDES Capability`
- `Agent USES Tool`
- `Tool TOUCHES Dataset`
- `Policy CONSTRAINS Dataset`
- `ApprovalRole APPROVES Task`
- `Outcome UPDATES priorSuccessRate`
- `Incident DERIVES remediationPlaybook`

## Consequences
- **Positive:** Enables deterministic, context-aware graph traversals to generate precise, policy-trimmed subgraphs for agent tasks.
- **Positive:** Simplifies access control and policy enforcement at the edge layer by traversing constraints (e.g., `Policy CONSTRAINS Dataset`).
- **Positive:** Centralizes capabilities, tool usage, and performance outcomes for dynamic orchestration and feedback loops.
- **Negative:** Requires rigorous schema validation and entity resolution mechanisms during ingestion.
- **Negative:** Subgraph operations (like 2-hop bounds and deduplication) for Context Compaction are highly sensitive to graph density, requiring ongoing performance tuning.
