# Dependency Rules for FE↔BE Delivery

This document formalizes how we map, plan, and resolve dependencies between
frontend (FE) and backend (BE) work while accounting for shared reviewers and
CI capacity constraints.

## 1) Dependency Mapping (FE↔BE)

### 1.1 Required artifacts

Every cross-layer change must declare the following artifacts in planning:

- **API contract**: GraphQL schema changes, REST endpoints, or event schemas.
- **Data model**: DB migrations, type definitions, or schema evolution notes.
- **Feature flag**: Name, default state, and rollout owner (if applicable).
- **Test scope**: Unit/integration/e2e expectations and ownership.
- **Release notes**: User-visible behavior changes.

### 1.2 Mapping matrix (must be filled for each dependency)

| Item         | FE Owner | BE Owner | Contract | Status | Target Date |
| ------------ | -------- | -------- | -------- | ------ | ----------- |
| API/query    |          |          |          |        |             |
| Schema/data  |          |          |          |        |             |
| Feature flag |          |          |          |        |             |
| Tests        |          |          |          |        |             |

### 1.3 Contract-first workflow

1. **Declare contract** (schema/interface + example payloads).
2. **Agree on compatibility** (backward/forward, field deprecation windows).
3. **Lock the contract** (no breaking changes without updated planning notes).
4. **Implement** in parallel (FE and BE with mocked fixtures as needed).
5. **Validate** (integration tests + e2e with feature flag gates).

## 2) Shared Reviewers and CI Constraints

### 2.1 Reviewer planning and budgeting

- **Shared reviewer pool**: Identify critical reviewers (API, data model,
  security, UX). Record their weekly review capacity.
- **Review budget**: Cap total review load per reviewer per week. Use a
  lightweight unit (e.g., _review points_ or _PR count_).
- **WIP limits**: Do not exceed active review slots for shared reviewers.
- **Review windows**: Reserve specific review blocks for cross-layer changes.

### 2.2 CI constraints planning and budgeting

- **CI budget**: Track expected pipeline minutes per PR and per week.
- **Critical pipelines**: PR quality gate, integration tests, and e2e runs are
  budgeted first.
- **Queue awareness**: If CI queue time exceeds agreed thresholds, reduce PR
  concurrency or split work.
- **Budget adjustments**: Increase CI budget via batching, off-peak runs, or
  temporary test-scope reduction (must be documented and approved).

## 3) Contention Identification Step (Planning Gate)

Before approving a plan, run a contention check:

- **Reviewer bottlenecks**: Are shared reviewers over capacity?
- **CI load**: Do forecasted runs exceed the weekly CI budget?
- **Environment constraints**: Are staging/test environments saturated?
- **Release coupling**: Are multiple changes targeting the same contract
  or schema?

If any contention is detected, the plan must include a mitigation path (e.g.,
sequencing, splitting, or resourcing adjustments).

## 4) Priority Resolution Rules

When dependencies conflict or capacity is exceeded, resolve in this order:

1. **Safety/Compliance**: Security, privacy, and policy-driven requirements.
2. **User impact**: Features with immediate customer/mission impact.
3. **Critical path**: Dependencies that unblock multiple downstream items.
4. **Risk reduction**: Changes that reduce operational or architectural risk.
5. **Effort vs. value**: Prefer small, high-value deliverables.

### 4.1 Resolution tactics

- **Sequence work**: Complete contract foundations before dependent UI work.
- **Split delivery**: Decompose into incremental, reviewable slices.
- **Defer**: Move lower-priority work out of the current sprint.
- **Escalate**: If priorities are unclear, escalate to governance/DRI.

## 5) Required Planning Outputs

Each cross-layer initiative must produce:

- Completed dependency mapping matrix.
- Named shared reviewers and review budget.
- CI budget estimate with pipeline list.
- Contention check results and mitigation plan.
- Priority resolution notes (if any conflicts).
