# Security Ledger

This document tracks security threats, mitigations, and their verification status via evidence artifacts.

## Threat Model: Retrieval Substrate

| ID | Threat | Severity | Mitigation | Verification | Status |
|---|---|---|---|---|---|
| RET-001 | **PII Embedding Leakage** | Critical | Ingest Policy Gate checks PII tags before embedding generation. | `policy.json` (ingest gate result) | Planned |
| RET-002 | **Cross-Tenant Graph Traversal** | Critical | Execution Policy Gate enforces `tenant_id` constraints in Cypher/GSQL. | `plan.json` (constraints) | Planned |
| RET-003 | **Prompt Injection via Sources** | High | Source hashing + Content Sanitization (future). | `sources.json` (hashes) | Planned |
| RET-004 | **Graph Poisoning** | High | Provenance linking of all nodes to signed `Input` artifacts. | `retrieval.json` (evidence refs) | Planned |

## Evidence IDs

- `retrieval_plan_ir`
- `retrieval_policy_gate`
- `retrieval_evidence_bundle`
- `retrieval_determinism_test`
