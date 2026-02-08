# Reasoning Scope Isolation Architecture

## Purpose
Reasoning scope isolation ensures derived claims are ephemeral, deterministic, and never leak across
scopes unless explicitly promoted through a governed workflow. This protects the Fact Plane from
epistemic drift while preserving fast, scoped inference for GraphRAG workloads.

## Core Principles
1. **Fact Plane is authoritative**: facts are curated, globally durable, and never implicitly
   overwritten by inference.
2. **Inference Plane is disposable**: derived claims are scoped, TTL-governed, and isolated by
   `scope_id`.
3. **Deterministic replay**: a scope is replayable with the same dataset snapshot, policy, and
   evidence bundle.
4. **Deny-by-default traversal**: Cypher queries default to facts-only; derived traversal is explicit.

## MAESTRO Threat Modeling Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection to traverse derived edges, cross-tenant leakage, inferred
  claim persistence beyond TTL, tool misuse bypassing policy.
- **Mitigations**: deny-by-default query policy, scope-bound writes, deterministic evidence
  artifacts, and TTL enforcement hooks.

## Architecture Overview

### Dual-Plane Model
- **Fact Plane (global)**: `:Fact`, `:Entity`, `:Source`.
- **Inference Plane (scoped)**: `:Derived`, `:Claim`, `:Scope`.

### Scope Manager
- Create/close scope IDs (UUIDv7) and record scope metadata.
- Ensure derived writes always include `scope_id`.
- Enforce scoped retrieval predicates.

### Claim Registry
Each claim is a first-class entity with lifecycle semantics:
- `claim_id`, `kind` (`fact|derived`), `confidence`, `provenance`, `valid_from`, `valid_to`,
  `ttl_policy`, `last_validated_at`.

### Deterministic Evidence Bundle
Each scoped run must emit:
- `report.json`: run summary and derived counts
- `metrics.json`: metrics including leakage/drift scores
- `stamp.json`: `git_sha`, `build_id`, `policy_id`, `dataset_snapshot_id`, `scope_id`

## Data Model

### Labels
- `:Fact`, `:Entity`, `:Source`
- `:Derived`, `:Claim`, `:Scope`

### Relationships
- `(:Scope)-[:CONTAINS]->(:Claim|:Derived)`
- `(:Claim)-[:SUPPORTED_BY]->(:Source)`
- Derived edges must include `scope_id` and `derived: true`.

## Query Policies (Facts-Only Default)
All retrieval queries enforce:
- `coalesce(r.derived, false) = false`
- `NOT n:Derived`

Derived traversal requires explicit policy override (`allow_inference = true`).

## Promotion Workflow (Governed)
1. Derived claim enters review queue with TTL.
2. Approval decision is logged with provenance and policy evidence.
3. Promotion writes to the Fact Plane with a reversible diff.

## Determinism Envelope
- Fixed dataset snapshot ID.
- Fixed policy version.
- Fixed model version + decoding settings.

## Deliverables
- Policy file: `policies/reasoning_policy.yaml`
- Schemas: `schemas/claim.schema.json`, `schemas/scope.schema.json`
- Ops runbook: `docs/ops/claim_lifetimes_runbook.md`
- Security guardrails: `docs/security/inference_firewalls.md`
- Evals: `docs/evals/contamination_benchmark.md`
