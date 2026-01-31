# Graph Reasoning Controls

**Framework Alignment:** SOC 2 Type II, ISO 27001:2022, NIST AI RMF
**Status:** Active
**Owner:** Compliance Engineering

## Overview

This document maps Summit's "Graph Intent Architecture" primitives to formal compliance controls. By treating graph retrieval as a deterministic compiler problem, we convert "AI Black Box" risks into auditable software engineering artifacts.

## Controls Matrix

| Control ID | Primitive | Description | Verification Artifact | Framework Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GR-001** | **Intent Compilation** | All AI graph access must be mediated by a validated `IntentSpec`. Direct LLM-to-DB connections are prohibited. | `IntentSpec` logs (JSON) | NIST AI RMF Map 1.2 |
| **GR-002** | **Evidence Budgeting** | Every query must have hard limits on node/edge count to prevent resource exhaustion and hallucinations. | CI Checks (`verify_query_determinism.ts`) | SOC 2 CC 5.2 (Resource Availability) |
| **GR-003** | **Deterministic Retrieval** | Query logic must guarantee stable ordering (`ORDER BY`) to ensure identical inputs yield identical outputs. | Determinism Test Suite | ISO 27001 A.8.25 (Secure Development) |
| **GR-004** | **Reasoning Traceability** | Every LLM claim must cite specific Evidence IDs retrieved via a logged Cypher query. | Trace Logs (`intent_id` -> `evidence_id`) | EU AI Act (Transparency) |
| **GR-005** | **Neural Prior Governance** | GNN-derived scores (trust, importance) must be versioned as graph properties, not computed opaquely at runtime. | Graph Schema Versioning | NIST AI RMF Measure 2.6 |

## Audit Procedure

1.  **Select Sample:** Randomly select 5 `IntentSpec` logs from the production `provenance` table.
2.  **Verify Structure:** Ensure each spec conforms to `schemas/intent_spec.schema.json`.
3.  **Replay:** Execute the `generated_cypher` against a graph snapshot.
4.  **Compare:** Verify that the returned Evidence IDs match the original production trace.
5.  **Pass/Fail:** Any deviation constitutes a "Reasoning Integrity Failure".
