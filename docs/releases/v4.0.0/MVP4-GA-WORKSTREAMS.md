# MVP-4-GA Engineering Workstreams

**Objective**: Parallel execution to close all Critical Path gaps.

---

## Workspace 1: Server Hardening & Invariants

**Owner**: Backend Lead
**Goal**: Make the server behavior deterministic and strictly typed.

- [ ] **Gap**: Loose TS types (`any`).
  - **Action**: Standardize `tsconfig` strict mode (incremental). Replace explicit `any` with `unknown` or typed schemas.
- [ ] **Gap**: Unhandled 500s.
  - **Action**: Implement Global Error Handler that catches all exceptions and maps to typed GraphQLErrors.
- [ ] **Gap**: Input Validation.
  - **Action**: Ensure all GraphQL mutations use Zod validators that match the schema 1:1.

## Workspace 2: Policy & Governance Expansion

**Owner**: Security Lead
**Goal**: 100% Policy Coverage on Mutations.

- [ ] **Gap**: Partial Policy Coverage.
  - **Action**: Audit all 50+ mutations. Add `authz.ensure(Action, Resource)` calls to every resolver.
- [ ] **Gap**: Policy Testing.
  - **Action**: Create unit tests for Rego policies (positive/negative cases).
- [ ] **Gap**: Drift.
  - **Action**: Implement a "Policy Watcher" that alerts if OPA active policies differ from Git policies.

## Workspace 3: Evidence & Provenance

**Owner**: Compliance Lead
**Goal**: Chain of Custody for every artifact.

- [ ] **Gap**: Evidence Linking.
  - **Action**: Update build pipeline to generate `provenance.json` linking Commit -> Docker Image -> Test Results.
- [ ] **Gap**: SBOM.
  - **Action**: Integrate `syft` or `trivy` to generate SBOMs during build.
- [ ] **Gap**: Signing.
  - **Action**: Sign all release artifacts (images, blobs) with Cosign.

## Workspace 4: CI Reliability & Gates

**Owner**: Release Captain
**Goal**: The Pipeline is the only way to ship.

- [ ] **Gap**: Flaky Tests.
  - **Action**: Implement "Quarantine" workflow for flaky tests to unblock merge queue while preserving signal.
- [ ] **Gap**: Promotion Gates.
  - **Action**: Update `.github/workflows/deploy.yml` with hard approvals and check verification.
- [ ] **Gap**: Negative Testing.
  - **Action**: Add specific integration tests that TRY to break the rules (e.g., unauthorized access) and ASSERT failure.

## Workspace 5: Docs as Contracts

**Owner**: Tech Writer / PM
**Goal**: Documentation reflects reality 100%.

- [ ] **Gap**: Stale Docs.
  - **Action**: Prune deprecated docs. Update API reference to match v4 schema.
- [ ] **Gap**: Release Notes.
  - **Action**: Automate Release Note generation based on Conventional Commits.

## Workspace 6: Release & Rollback Safety

**Owner**: SRE Lead
**Goal**: Safe to fail, fast to recover.

- [ ] **Gap**: Rollback Automation.
  - **Action**: Script the rollback process (`make rollback v=3.5`).
- [ ] **Gap**: Monitoring.
  - **Action**: Dashboards showing "Version Health" (Error rate relative to previous version).

---

## Execution Strategy

- **Daily Sync**: 15min standup on blockers.
- **Weekly Demo**: Show hardening in action (e.g., "Watch the server reject this bad request").
- **Merge Train**: Keep `main` green. Revert broken builds immediately.
