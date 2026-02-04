# ARK Implementation Plan

This document outlines the roadmap for implementing the Agentic Reasoning Kernel (ARK) for Summit.

## Overview
ARK is being implemented as a dedicated package `@summit/ark` within the monorepo. It will orchestrate existing components (`maestro-core`, `work-graph`) and introduce new primitives for governance and evolution.

## Phase 0: Skeleton (Foundations)

**Goal:** Establish the runtime loop, ledger, and basic tool execution.

### PR 1: Core Scaffolding & Run Ledger
- **Scope:** `packages/ark/src/ledger`
- **Tasks:**
  - Implement `RunLedger` class backed by PostgreSQL (or `work-graph` store).
  - Implement `Event` appending logic with immutable ID generation.
  - Create database migrations for `runs` and `events` tables.
  - **Verification:** Unit tests for Ledger persistence and retrieval.

### PR 2: ToolBus Basic Implementation
- **Scope:** `packages/ark/src/toolbus`
- **Tasks:**
  - Implement `ToolRegistry` to register `Tool` definitions.
  - Implement `ToolExecutor` that handles permission checks (stubbed) and execution.
  - Integrate with `Event` ledger to record `ToolCallRequested` and `ToolCallCompleted`.
  - **Verification:** Test registering a dummy tool and executing it via the bus.

### PR 3: Planner Loop (Single-Agent)
- **Scope:** `packages/ark/src/planner`
- **Tasks:**
  - Implement a basic `ReAct` or `Plan-Solve` loop.
  - Define `Planner` interface that accepts a `Run` context.
  - Connect `Planner` -> `ToolBus` -> `Ledger`.
  - **Verification:** End-to-end test of a simple task (e.g., "Get time").

### PR 4: Public Run API
- **Scope:** `packages/ark/src/api` & `server/src/routes/ark`
- **Tasks:**
  - Implement the OpenAPI routes defined in `openapi.yaml`.
  - Connect routes to `ArkOrchestrator` (facade).
  - **Verification:** API integration tests using Supertest.

---

## Phase 1: Governance Hardening

**Goal:** Enforce policy-as-code and provenance.

### PR 5: Policy Engine Integration
- **Scope:** `packages/ark/src/governance`
- **Tasks:**
  - Integrate `@summit/policy-engine` (OPA/Rego) into `ToolBus`.
  - Add `PolicyDecision` events to the ledger.
  - Implement "Pre-flight" checks for every tool call.

### PR 6: Evidence & Provenance
- **Scope:** `packages/ark/src/evidence`
- **Tasks:**
  - Implement `EvidenceStore` (blob storage + metadata).
  - Update `Planner` to require evidence links for claims.
  - Implement `ProvenanceVerifier` that checks claim-evidence integrity.

### PR 7: Audit Bundle Export
- **Scope:** `packages/ark/src/audit`
- **Tasks:**
  - Create a job to export a `Run` + `Events` + `Evidence` as a signed bundle.
  - Implement `GET /runs/{id}/audit` endpoint.

---

## Phase 2: Self-Evolution

**Goal:** Close the loop from operations to improvement.

### PR 8: Memory Tiers
- **Scope:** `packages/ark/src/memory`
- **Tasks:**
  - Implement `WorkingMemory` (Redis), `EpisodicMemory` (Vector DB), `SkillMemory`.
  - Add memory retrieval tools to the `ToolBus`.

### PR 9: Feedback & Graders
- **Scope:** `packages/ark/src/evolution`
- **Tasks:**
  - Implement `FeedbackService` to ingest human/auto feedback.
  - Create `AutoGrader` interface and standard implementations (e.g., JSON Validator).

### PR 10: Trace-to-Dataset Pipeline
- **Scope:** `packages/ark/src/evolution/pipeline`
- **Tasks:**
  - Implement a pipeline to filter successful runs.
  - Convert runs to SFT (Supervised Fine-Tuning) formats.
  - Apply PII redaction (integration with `libs/pii`).

---

## Phase 3: Collective Orchestration

**Goal:** Multi-agent collaboration.

### PR 11: Multi-Agent Router
- **Scope:** `packages/ark/src/orchestrator`
- **Tasks:**
  - Extend `Planner` to support delegation to other agents (sub-runs).
  - Implement `Role` based dispatching.

### PR 12: Shared Protocols
- **Scope:** `packages/ark/src/protocols`
- **Tasks:**
  - Implement `Contract` negotiation protocol.
  - Implement `Arbitration` logic for conflicting plans.
