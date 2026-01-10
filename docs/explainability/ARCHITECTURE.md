# EXPLAINABILITY Architecture

## Overview

EXPLAINABILITY instruments Summit's AI pipeline to capture complete reasoning chains for every AI-generated insight. When Copilot recommends an action or Black Projects modules produce analysis, operators can inspect the **exact** sequence of operations that led to that conclusion.

## Core Concepts

### Inference Chain
An inference chain is a directed acyclic graph (DAG) of operations:
- **Root**: User query or agent task
- **Nodes**: Individual operations (RAG query, graph traversal, policy check, model invocation)
- **Edges**: Parent/child relationships (operation X triggered operation Y)

### Instrumentation Points
- **RAG Service**: Captures vector similarity queries, retrieved documents, scores
- **Neo4j Driver**: Captures Cypher queries, execution plans, returned nodes/edges
- **OPA Policy Fetcher**: Captures policy evaluations, matched rules, allow/deny decisions
- **Black Projects Meta-Router**: Captures module selection, prompts, model parameters

## Data Flow

\`\`\`
User Query
  ↓
Apollo Resolver (creates inference context)
  ↓
RAG Service (wrapped) → Emits rag.query events
  ↓
Neo4j Driver (wrapped) → Emits graph.traversal events
  ↓
Policy Check (wrapped) → Emits policy.decision events
  ↓
Collector (Redis subscriber) → Assembles inference tree
  ↓
PostgreSQL (persists inference chains)
  ↓
Query API (retrieves for audit/review)
\`\`\`

## Storage Schema

### PostgreSQL: inference_chains

\`\`\`sql
CREATE TABLE inference_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inference_id UUID NOT NULL UNIQUE,
  parent_inference_id UUID,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inference_chains_inference_id ON inference_chains(inference_id);
CREATE INDEX idx_inference_chains_user_id ON inference_chains(user_id);
CREATE INDEX idx_inference_chains_timestamp ON inference_chains(timestamp);
\`\`\`

## Performance Considerations

- **Overhead Target**: <5% latency increase per operation
- **Strategy**: Async event emission via Redis pub/sub
- **Batching**: Collector batches writes to PostgreSQL (100ms window)
- **Sampling**: Optional sampling mode for high-volume operations (configurable)

## Security & Privacy

- **Access Control**: Inference chains inherit ACLs of source entities
- **PII Redaction**: Sensitive fields redacted before storage (via OPA policy)
- **Encryption**: JSONB data encrypted at rest (PostgreSQL TDE)

## GraphQL API

\`\`\`graphql
type InferenceChain {
  id: ID!
  inferenceId: ID!
  parentInferenceId: ID
  eventType: String!
  timestamp: DateTime!
  data: JSON!
  children: [InferenceChain!]!
}

type Query {
  inferenceChain(inferenceId: ID!): InferenceChain
  inferenceChainsByUser(userId: ID!, limit: Int = 100): [InferenceChain!]!
}
\`\`\`

## Integration Points

- **MERKLE-GRAPH**: Inference chains can include Merkle proofs for cryptographic verification
- **COMPLIANCE-CORE**: Inference chains exported as audit evidence for AI decision controls
- **NEXUS**: Collaborative sessions include attribution via inference chains

## Rollout Plan

1. **Week 1**: Deploy SDK and collector (shadow mode, no API exposure)
2. **Week 2**: Instrument RAG service only (limited blast radius)
3. **Week 3**: Expand to Neo4j and OPA (full coverage)
4. **Week 4**: Enable GraphQL API, production rollout

## Success Metrics

- **Coverage**: >95% of AI operations with complete inference chains
- **Overhead**: <5% latency increase (p95)
- **Adoption**: Operators using inference chains for verification (survey)

---

**Status**: Ready for Implementation
**Agent**: EXPLAINABILITY-ALPHA
**Branch**: `feat/explainability-engine`
