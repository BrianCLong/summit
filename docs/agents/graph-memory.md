# Agentic Graph Memory

**Owner:** Agent Core
**Last-Reviewed:** 2026-01-24
**Evidence-IDs:** none
**Status:** active

## Overview

Summit agents (Atlas, Antigravity, Jules, etc.) utilize the Knowledge Graph as a long-term memory substrate. Unlike ephemeral session history, Graph Memory allows agents to persist reasoning traces, reuse prior decisions safely, and maintain a governance-compliant history of actions.

## Memory Schema

### Node Types

| Label | Description | Key Properties |
| :--- | :--- | :--- |
| **AgentDecision** | A high-level decision made by an agent. | `id`, `timestamp`, `agent_id`, `outcome`, `confidence` |
| **ReasoningStep** | An atomic step in a chain-of-thought process. | `id`, `thought`, `action_taken`, `observation` |
| **ContextSnapshot** | A reference to the GraphRAG context used for a decision. | `id`, `context_hash`, `evidence_ids` |

### Relationship Types

| Relationship | Start Node | End Node | Description |
| :--- | :--- | :--- | :--- |
| `LED_TO` | ReasoningStep | AgentDecision | Connects reasoning steps to the final decision. |
| `USED_CONTEXT` | AgentDecision | ContextSnapshot | Links a decision to the specific data it was based on. |
| `SUPPORTED_BY` | AgentDecision | Evidence | Direct link from a decision to supporting evidence nodes. |
| `SUBSEQUENT_TO` | AgentDecision | AgentDecision | Temporal link between decisions to maintain state. |

## Governance Compliance

Graph Memory is subject to the same governance controls as all other Summit data:

1.  **Immutability**: Once a decision is committed to Graph Memory, it cannot be deleted, only superseded by a new decision with a `SUPERSEDES` relationship.
2.  **Redaction**: PII and sensitive data must be redacted from ReasoningStep `thought` and `observation` fields before persistence.
3.  **Auditability**: Every decision node must link back to a `ContextSnapshot` containing the exact `evidence_id`s used.

## Multi-Agent Decision Sharing

Agents can "consult" the Graph Memory to see how other agents handled similar situations:

```cypher
// Find prior decisions about a specific target
MATCH (d:AgentDecision)-[:SUPPORTED_BY]->(e:Evidence {target: 'target-x'})
RETURN d.outcome, d.confidence, d.agent_id
ORDER BY d.timestamp DESC
LIMIT 5;
```

This ensures cross-agent consistency and reduces redundant reasoning costs.
