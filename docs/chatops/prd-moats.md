# Product Requirements Document: ChatOps Moats

## 1. Bounded Autonomy Engine
- **Summary**: Risk-tiered execution framework (Autonomous, HITL, Prohibited).
- **Core Components**: Plan Agent, Research Agent, Executor Agent.
- **Requirements**:
  - ReAct traces must be logged to provenance ledger.
  - HITL gates trigger workflow requests to human analysts.
  - OPA policies determine risk-tier based on target domain and capability.

## 2. Hierarchical Memory System
- **Summary**: 3-tier memory system with semantic selection.
- **Core Components**: Redis (Short), Postgres JSONB (Medium), Neo4j (Long).
- **Requirements**:
  - Token budget dynamically allocated per query.
  - Medium-term memory uses hierarchical summarization.
  - Long-term memory represents persistent graph facts.

## 3. Graph-Native Chat Interface (NL->Cypher)
- **Summary**: Parse user natural language to Cypher and execute.
- **Core Components**: Entity Extractor, Subgraph Schema Inferencer, NL->Cypher Generator.
- **Requirements**:
  - Must use multi-model consensus for extraction and generation.
  - Results ranked by confidence.
