# OpenSandbox vs. Summit Architecture

Below is a clear conceptual architecture diagram showing how the OpenSandbox model maps into Summit's system, and where Summit creates a defensible moat.

---

## 1. Conceptual Architecture Diagram

```
                   ┌─────────────────────────────────────┐
                   │              CLIENTS                 │
                   │  API / SDK / UI / Automation tools  │
                   └─────────────────────────────────────┘
                                   │
                                   ▼
                ┌──────────────────────────────────┐
                │         SUMMIT API LAYER         │
                │ GraphQL + REST Gateway           │
                │ src/api/graphql / src/api/rest   │
                └──────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────┐
          │          MULTI-AGENT ORCHESTRATION             │
          │ src/agents/                                    │
          │                                                │
          │ Planner Agent                                  │
          │ Worker Agents                                  │
          │ Observer / Guardrail Agents                    │
          │                                                │
          └────────────────────────────────────────────────┘
                                   │
                                   ▼
      ┌───────────────────────────────────────────────────────────┐
      │        SUMMIT AGENT RUNTIME (OpenSandbox Equivalent)      │
      │                                                           │
      │ src/agents/runtime/                                       │
      │                                                           │
      │ ┌─────────────────────────────┐                           │
      │ │ Sandbox Manager             │                           │
      │ │ container / vm isolation    │                           │
      │ └─────────────────────────────┘                           │
      │                                                           │
      │ ┌─────────────────────────────┐                           │
      │ │ Tool Invocation Gate        │                           │
      │ │ policy enforcement          │                           │
      │ └─────────────────────────────┘                           │
      │                                                           │
      │ ┌─────────────────────────────┐                           │
      │ │ Runtime Resource Manager    │                           │
      │ │ cpu / memory / call limits  │                           │
      │ └─────────────────────────────┘                           │
      │                                                           │
      │ ┌─────────────────────────────┐                           │
      │ │ Execution Audit Logger      │                           │
      │ │ deterministic traces        │                           │
      │ └─────────────────────────────┘                           │
      │                                                           │
      └───────────────────────────────────────────────────────────┘
                                   │
                                   ▼
      ┌───────────────────────────────────────────────────────────┐
      │                  SUMMIT INTELLIGENCE LAYER                │
      │                                                           │
      │ GraphRAG Pipeline                                         │
      │ src/graphrag/                                             │
      │                                                           │
      │ Neo4j Knowledge Graph                                     │
      │ Qdrant Vector Retrieval                                   │
      │ Context synthesis                                         │
      │                                                           │
      └───────────────────────────────────────────────────────────┘
                                   │
                                   ▼
      ┌───────────────────────────────────────────────────────────┐
      │                    CONNECTORS / TOOLS                     │
      │ src/connectors/                                           │
      │                                                           │
      │ REST APIs                                                 │
      │ CSV ingestion                                             │
      │ S3 ingestion                                              │
      │ enterprise systems                                        │
      │                                                           │
      └───────────────────────────────────────────────────────────┘
                                   │
                                   ▼
      ┌───────────────────────────────────────────────────────────┐
      │                       DATA LAYER                          │
      │                                                           │
      │ Neo4j                                                     │
      │ PostgreSQL                                                │
      │ Redis                                                     │
      │ Qdrant                                                    │
      │                                                           │
      └───────────────────────────────────────────────────────────┘
```

---

## 2. Where OpenSandbox Fits

OpenSandbox roughly corresponds to **only this layer**:

```
Agent Runtime Sandbox
   ├── isolated execution
   ├── unified API
   ├── tool access
```

Which maps to Summit:

```
src/agents/runtime/
```

---

## 3. Where Summit Surpasses OpenSandbox

OpenSandbox focuses on **safe execution**.

Summit adds **intelligence + governance + enterprise data integration**.

| Capability                | OpenSandbox | Summit |
| ------------------------- | ----------- | ------ |
| agent sandbox             | ✓           | ✓      |
| execution API             | ✓           | ✓      |
| policy tool gate          | partial     | ✓      |
| multi-agent orchestration | unknown     | ✓      |
| GraphRAG knowledge system | ✗           | ✓      |
| enterprise connectors     | ✗           | ✓      |
| deterministic audit trail | partial     | ✓      |
| CI governance gates       | ✗           | ✓      |

---

## 4. The Moat (Why Summit Is Harder To Replicate)

The real moat is the **three-layer stack**:

```
AGENTS
   ↓
SANDBOX RUNTIME
   ↓
GRAPH INTELLIGENCE
```

Alibaba built:

```
AGENTS
   ↓
SANDBOX
```

Summit adds **two strategic layers**:

### Layer 1 — Knowledge Graph Intelligence

```
GraphRAG
Neo4j
Vector retrieval
```

Agents reason over **structured enterprise knowledge**, not just prompts.

---

### Layer 2 — Governance Runtime

```
policy gates
audit logs
CI verification
```

Which enables:

* enterprise compliance
* deterministic AI execution
* auditability

---

## 5. Execution Flow (Full System)

```
Client request
     ↓
API Gateway
     ↓
Planner Agent
     ↓
Runtime Policy Gate
     ↓
Sandbox Launch
     ↓
GraphRAG Context Retrieval
     ↓
Tool Invocation
     ↓
Audit Log
     ↓
Response
```

---

## 6. Key Defensive Advantage

Summit’s moat is the **closed loop between runtime, knowledge, and governance**:

```
GraphRAG context
        ↓
Agent execution
        ↓
Policy enforcement
        ↓
Audit evidence
        ↓
CI verification
```

This turns the platform into **an enterprise AI operating system**, not just an agent sandbox.

---

✅ **In short**

OpenSandbox = **safe place for agents to run**

Summit = **secure + intelligent + governed agent operating system**
