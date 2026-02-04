# Security Ledger

This document tracks security threats, mitigations, and their verification status via evidence artifacts.

## Threat Model: Retrieval Substrate

| ID | Threat | Severity | Mitigation | Verification | Status |
|---|---|---|---|---|---|
| RET-001 | **PII Embedding Leakage** | Critical | Ingest Policy Gate checks PII tags before embedding generation. | `policy.json` (ingest gate result) | Planned |
| RET-002 | **Cross-Tenant Graph Traversal** | Critical | Execution Policy Gate enforces `tenant_id` constraints in Cypher/GSQL. | `plan.json` (constraints) | Planned |
| RET-003 | **Prompt Injection via Sources** | High | Source hashing + Content Sanitization (future). | `sources.json` (hashes) | Planned |
| RET-004 | **Graph Poisoning** | High | Provenance linking of all nodes to signed `Input` artifacts. | `retrieval.json` (evidence refs) | Planned |

## Threat Model: Policy Cards v0

| ID | Threat | Severity | Mitigation | Verification | Status |
|---|---|---|---|---|---|
| POL-001 | **Policy Bypass** | Critical | Runtime Shim (deny-by-default) + Regression Tests. | `metrics.json` (block_rate), `policy_bypass_attempt_test` | Implemented |
| POL-002 | **Sensitive Data Leakage** | High | Never-Log Rules + Scrubber. | `report.json` (evidence checks) | Planned |
| POL-003 | **Policy Drift** | Medium | Canonicalization + Drift Monitor. | `drift_report.json` | Implemented |

## Threat Model: Supply Chain

| ID | Threat | Severity | Mitigation | Verification | Status |
|---|---|---|---|---|---|
| SC-001 | **PackageGate / Shai-Hulud** | Critical | Enforce pnpm >= 10.26.0 to prevent git-dep RCE. | `package.json` (packageManager field) | Implemented |

## Evidence IDs

- `EVID-POLICY-*-report`
- `EVID-POLICY-*-runtime`
- `retrieval_plan_ir`
- `retrieval_policy_gate`
- `retrieval_evidence_bundle`
- `retrieval_determinism_test`
