# Composio Orchestrator Standards

## Overview
Summit adopts a DAG-based multi-agent orchestration model inspired by Composio. This replaces linear ReAct loops with declarative, policy-governed workflows.

## Standards
- **Graph Structure**: Workflows must be defined as Directed Acyclic Graphs (DAGs).
- **Agent Roles**: Each agent in the graph must have a defined role and set of capabilities.
- **Evidence IDs**: All orchestration outputs must use the `SUMMIT-ORCH-XXXX` evidence ID pattern.
- **Determinism**: Orchestration must be deterministic. No unstable timestamps are allowed in artifacts.
- **Policy Gating**: Every edge in the DAG must be explicitly approved in the policy configuration.

## Workflow DSL
Workflows are defined in YAML:
```yaml
agents:
  - name: researcher
    role: research_specialist
  - name: critic
    role: quality_assurance
edges:
  - from: researcher
    to: critic
policy:
  allowed_edges:
    - from: researcher
      to: critic
```
