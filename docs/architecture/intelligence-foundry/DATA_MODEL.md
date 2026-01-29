# Intelligence Foundry Data Model (Canonical)

This document defines canonical entities and their minimal required fields. Storage implementation is free to vary, but serialization MUST be deterministic.

## Core Entities

### Tenant

- tenant_id (string)
- name (string)
- trust_roots (keys/certs)
- policy_default (policy_id)

### Asset

- asset_id
- tenant_id
- type (document, dataset, image, video, audio, code, embedding_index, model_training_set, other)
- uri (optional)
- content_hash (required)
- rights_profile
  - owner
  - license (text or reference)
  - allowed_uses (list)
  - jurisdictions (list)
  - expiration (optional)
- classification (public, internal, confidential, regulated)
- created_at, updated_at

### Policy

- policy_id
- tenant_id
- version
- policy_hash (required)
- rules (machine-evaluable)
- approvals_required (optional)
- reproducibility_mode (strict|best_effort)
- retention_profile

### Model

- model_id
- tenant_id
- kind (foundation, fine_tune, adapter, prompt_program)
- provider (internal|external)
- version
- digest (required)
- constraints (license/usage)
- eval_reports (references to assets)
- security_metadata (scans, SBOM refs)
- created_at

### Agent

- agent_id
- tenant_id
- version
- contract_hash (required)
- declared_tools (list)
- scope (text + machine tags)
- approvals_required (optional)

### Tool

- tool_id
- tenant_id (optional for global tools)
- kind (db, web, storage, compute, deploy, messaging, custom)
- policy_surface (allowed params schema)
- identity_mode (delegated|service)

### WorkOrder

- work_order_id
- tenant_id
- principal_id
- requested_at
- policy_id + policy_hash
- agent_id (optional)
- inputs (asset refs + prompt refs)
- requested_outputs (types + destinations)
- status

### Execution

- execution_id
- work_order_id
- start_at, end_at
- environment
  - code_revision
  - container_digest
  - runtime_version
- runs (list of Run)

### Run (Inference / Tool Call / Transform)

- run_id
- kind (inference, retrieval, tool_call, transform, evaluation, training_step)
- inputs (refs)
- outputs (refs)
- parameters (deterministic serialization)
- timestamps
- result_hash

### Artifact

- artifact_id
- work_order_id
- type (output, intermediate, report, manifest, log, model_weight, embedding_index, other)
- uri
- content_hash
- size
- mime
- created_at

### EvidenceBundle

- bundle_id
- work_order_id
- bundle_hash
- artifacts (manifest)
- attestations (list)
- sealed_at

## Relationship Graph (High Level)

Tenant
  ├─ owns Assets, Policies, Models, Agents
  ├─ submits WorkOrders
  └─ seals EvidenceBundles

WorkOrder
  ├─ references Policy + optionally Agent
  ├─ consumes Assets / prompts
  ├─ triggers Execution
  ├─ produces Artifacts
  └─ results in EvidenceBundle

Execution
  └─ emits Runs forming an Execution Graph

All nodes and edges MUST be content-addressed and versioned.
