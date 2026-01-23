# Agent Graph Memory Specification

## Overview
Agents utilize the Knowledge Graph not just for retrieval, but as a persistent memory store. This allows agents to maintain state, remember past decisions, and build a cumulative understanding of their domain.

## Memory Schema

Agents interact with specific node types designed for memory:

### 1. `AgentRun` Node
Represents a single execution session of an agent.
*   **Properties**:
    *   `run_id`: UUID
    *   `timestamp`: ISO8601
    *   `agent_id`: string
    *   `status`: pending | success | failure

### 2. `Decision` Node
Represents a specific choice or action taken by the agent.
*   **Properties**:
    *   `decision_id`: UUID
    *   `rationale`: Text explanation
    *   `confidence`: Float (0.0 - 1.0)
    *   `action_type`: string

### 3. `Observation` Node
Represents a fact or data point gathered by the agent.
*   **Properties**:
    *   `observation_id`: UUID
    *   `content`: Text content
    *   `source`: URI or citation

## Relationships

*   `(:AgentRun)-[:MADE_DECISION]->(:Decision)`
*   `(:Decision)-[:BASED_ON]->(:Observation)`
*   `(:Observation)-[:DERIVED_FROM]->(:Document)`

## Interaction Pattern

### Writing Memory
When an agent completes a task step:
1.  Create `Decision` node.
2.  Link to relevant `Observation` nodes (evidence).
3.  Link `AgentRun` to `Decision`.

### Reading Memory
When an agent starts a new task:
1.  Query for past `Decision` nodes related to the current context (via vector search on `rationale`).
2.  Traverse `BASED_ON` edges to understand the context of past decisions.

## Governance
*   **Immutability**: Memory nodes should be append-only.
*   **Attribution**: Every node must track which agent instance created it.
