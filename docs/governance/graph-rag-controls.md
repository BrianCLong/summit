# GraphRAG Governance & Audit Controls

**Owner:** Governance
**Last-Reviewed:** 2026-01-24
**Evidence-IDs:** none
**Status:** active

## Overview

GraphRAG introduces unique governance challenges, particularly around the non-deterministic nature of LLM generation based on retrieved subgraphs. Summit mitigates these risks through a set of mandatory controls.

## Control Mapping

| GraphRAG Step | Governance Control | Evidence Artifact |
| :--- | :--- | :--- |
| **Retrieval (Cypher)** | Query Whitelisting & Audit Logging | `logs/graph-retrieval-<sha>.json` |
| **Context Assembly** | Deterministic Sorting & Redaction | `artifacts/rag-context/<hash>.md` |
| **LLM Reasoning** | Prompt Injection Filtering & PII Shield | `logs/llm-gatekeeper-<id>.json` |
| **Response Generation** | Citation Verification | `artifacts/citations/verification-<id>.json` |

## Mandatory Procedures

### 1. Deterministic Replay
Every GraphRAG retrieval must be repeatable.
- **Requirement**: Store the Cypher query and the specific Neo4j database version/timestamp.
- **Verification**: Periodic automated tasks must re-run historical GraphRAG queries and compare results for consistency.

### 2. Evidence ID Consistency
The LLM must only use data that has a valid Evidence ID.
- **Requirement**: The `ContextAssembler` must omit any nodes that lack an `evidence_id` property.
- **Audit**: Post-generation citation checkers verify that every `[EVID-XXX]` tag in the LLM response corresponds to a node that was actually in the context.

### 3. Graph Access Control
Retrieval is subject to the user's/agent's RBAC/ABAC permissions.
- **Requirement**: Cypher generation must inject security filters (e.g., `WHERE n.classification <= $userMaxClassification`).
- **Enforcement**: This is enforced at the `GraphRetriever` layer.

## Audit Checklist for Regulators

When auditing a Summit GraphRAG decision, provide:
1.  **The Original Query**: What was asked.
2.  **The Cypher Trace**: The exact multi-hop path taken through the graph.
3.  **The Assembled Context**: Exactly what the LLM saw (with redactions preserved).
4.  **The LLM Response**: The raw and filtered output.
5.  **The Citation Map**: Linkage between response claims and original Evidence IDs.
