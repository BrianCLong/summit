# Summit Reference Standards

> **Status:** DRAFT STANDARD
> **Owner:** Jules (Chief Architect)
> **Last Updated:** 2025-05-15

## Overview

Summit defines the reference implementation for **Governed Agentic Systems**. To ensure interoperability and trust, we define the following open standards.

## 1. Universal Evidence Format (UEF)

**Purpose:** A standard schema for immutable, cryptographically-linked audit events.

**Schema Reference:** `ProvenanceEntryV2` (`server/src/provenance/types.ts`)

```json
{
  "id": "prov_12345",
  "sequenceNumber": "105",
  "previousHash": "sha256:...",
  "currentHash": "sha256:...",
  "timestamp": "ISO8601",
  "actionType": "DEPLOYMENT",
  "actor": {
    "id": "agent:codex",
    "type": "system"
  },
  "witness": {
    "witnessId": "witness_verifier_1",
    "signature": "..."
  },
  "metadata": {
    "riskScore": 15,
    "policyVersion": "1.2.0"
  }
}
```

**Compliance:**

* Must form a hash chain (`currentHash` depends on `previousHash`).
* Must include a detached signature from a registered authority.

## 2. Policy Exchange Schema (PES)

**Purpose:** A standard way to define and transport risk policies between tenants and agents.

**Schema Reference:** `PolicyContext` & `RiskRules` (`server/src/autonomous/policy-engine.ts`)

```json
{
  "profileId": "strict-compliance-v1",
  "guardrails": {
    "requirePurpose": true,
    "maxBudgetUsd": 50
  },
  "autonomyMatrix": {
    "read": 5,   // Full autonomy
    "write": 2,  // Assisted
    "deploy": 0  // Manual only
  }
}
```

## 3. Agent Task Protocol (ATP)

**Purpose:** A standard interface for delegating work to autonomous agents with safety guarantees.

**Schema Reference:** `Task` (`server/src/autonomous/orchestrator.enhanced.ts`)

**Key Requirements:**

1. **Idempotency Key:** Every task MUST have a deterministic key to prevent replay attacks or accidental double-execution.
2. **Safety Category:** Every task MUST declare its side-effect level (`READ`, `WRITE`, `DEPLOY`).
3. **Kill Switch Support:** Every agent runtime MUST subscribe to a standard `killswitch` signal.

## 4. Context Engineering Standard (CES)

**Purpose:** A standard framework for constructing, retrieving, and governing agent context, replacing ad-hoc "prompt engineering" with structured knowledge assembly.

**Schema Reference:** `ContextFrame` & `ResolutionStrategy` (`packages/maestro-core/src/context/types.ts`)

**Key Definitions:**

1.  **Context Frame:** A bounded, immutable unit of knowledge provided to an agent. It must be versioned and source-traceable.
    ```json
    {
      "frameId": "ctx_8823",
      "timestamp": "2026-01-27T10:00:00Z",
      "layers": [
        { "type": "SYSTEM", "ref": "sys_prompt_v2" },
        { "type": "EPISODIC", "ref": "mem_trace_442" },
        { "type": "KNOWLEDGE", "ref": "intelgraph_subgraph_88" }
      ],
      "tokenBudget": 8192,
      "integrityHash": "sha256:..."
    }
    ```

2.  **Context Resolution Protocol (CRP):** The deterministic method used to hydrate a frame.
    *   **Static:** Direct inclusion of immutable strings.
    *   **RAG:** Retrieval-augmented generation with citation enforcement.
    *   **MCP:** Live context fetched via Model Context Protocol servers.

3.  **Governance:**
    *   **Leakage Prevention:** All context frames must pass a PII/Secret scan before injection.
    *   **Attribution:** Every assertion in a context frame must trace back to a `ProvenanceEntry`.

## 5. Evidence Contract Standard (ECS)

**Purpose:** A formal contract between Retrieval systems (GraphRAG) and Consumer Agents (LLMs) ensuring deterministic, verifiable, and invariant-shaped evidence.

**Schema Reference:** `EvidenceContract` (`server/src/rag/evidence.ts`)

**Key Requirements:**

1. **Shape Invariance:** All graph queries MUST use `ORDER BY` and `LIMIT` to ensure deterministic result structures regardless of graph growth.
2. **Explicit Provenance:** Every retrieval result MUST be wrapped in an `EvidenceBundle` containing a unique `contractId` and `manifest` detailing the retrieval strategy.
3. **Counterfactual Readiness:** The system MUST support "ablation testing" where specific nodes or edges can be virtually removed to verify the necessity of evidence.
4. **Graph Metadata:** Analytics outputs (e.g., PageRank, Community ID) MUST be persisted to the graph and available for retrieval ranking.
