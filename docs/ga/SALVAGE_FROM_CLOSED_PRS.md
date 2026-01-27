# Salvage from Closed PRs Ledger

> **Canonical tracking document for GA-readiness PR recreation.**
> Updated: 2026-01-26

## Summary

| Category | Count |
|----------|-------|
| RECREATE NOW | 5 |
| RECREATE LATER | 3 |
| COMPLETED | 0 |
| BLOCKED | 1 |

---

## RECREATE NOW

Items classified as high-priority for GA readiness. Must be recreated with minimal, focused changes.

### 1. Fix TypeScript Package Type Declarations (BLOCKING GATE)

- **Source PRs**: #15391 (Include missing server sources in tsconfig), related fixes
- **Priority**: P0 - Blocking typecheck gate
- **Risk**: Low (type declarations only)
- **Status**: READY TO IMPLEMENT
- **Target Outcome**:
  1. Fix missing type declarations in `packages/feature-flags` (react, eventemitter3)
  2. Fix missing zod types in `packages/common-types` and `packages/sigint-processor`
  3. Ensure `pnpm typecheck` passes
- **Files Likely Touched**:
  - `packages/feature-flags/tsconfig.json`
  - `packages/feature-flags/package.json`
  - `packages/common-types/tsconfig.json`
  - `packages/sigint-processor/tsconfig.json`
  - `tsconfig.base.json` (if needed for types paths)
- **Verification Plan**:
  - `pnpm typecheck` exits 0
  - No new type errors introduced
- **Test Plan**:
  - CI typecheck job must pass
  - Existing tests continue to pass

---

### 2. Harden Express Input Validation and GraphQL Guard

- **Source PR**: #15366
- **Priority**: P1 - Security / GA required
- **Risk**: Medium (touches request handling)
- **Status**: READY TO IMPLEMENT
- **Target Outcome**:
  1. Add input sanitization middleware for Express routes
  2. Add GraphQL query depth limiting
  3. Add rate limiting to sensitive endpoints
- **Files Likely Touched**:
  - `server/src/middleware/validation.ts`
  - `server/src/graphql/guards.ts`
  - `server/src/app.ts`
- **Verification Plan**:
  - `pnpm test:server` passes
  - Manual test: malformed input returns 400, not 500
- **Test Plan**:
  - Unit tests for validation middleware
  - Integration test for GraphQL depth limit

---

### 3. Enforce Coverage Gate and Add API Fuzzing

- **Source PR**: #15365
- **Priority**: P1 - CI hardening / GA required
- **Risk**: Low (CI config only)
- **Status**: READY TO IMPLEMENT
- **Target Outcome**:
  1. Add coverage threshold enforcement to CI
  2. Add API fuzzing baseline workflow
- **Files Likely Touched**:
  - `.github/workflows/test.yml`
  - `jest.config.js` or package coverage config
  - New: `.github/workflows/api-fuzz.yml`
- **Verification Plan**:
  - Coverage drops below threshold → CI fails
  - Fuzzing workflow runs without error
- **Test Plan**:
  - Regression: coverage remains at current level
  - Fuzzing finds no critical issues (or documents known)

---

### 4. Automate Issue Triage Labeling

- **Source PR**: #15368
- **Priority**: P2 - Developer velocity
- **Risk**: Low (GH Actions only)
- **Status**: READY TO IMPLEMENT
- **Target Outcome**:
  1. Auto-label new issues based on file paths changed
  2. Auto-assign issues to appropriate team
- **Files Likely Touched**:
  - `.github/workflows/auto-label.yml`
  - `.github/labeler.yml`
- **Verification Plan**:
  - New issue created → labels applied
  - No false positives on label assignment
- **Test Plan**:
  - Manual: create test issue, verify labels

---

### 5. Organize Workspaces with Turborepo Segmentation

- **Source PR**: #15370
- **Priority**: P2 - Build performance
- **Risk**: Medium (monorepo config)
- **Status**: READY TO IMPLEMENT
- **Target Outcome**:
  1. Configure Turborepo for package-level caching
  2. Define task dependencies graph
- **Files Likely Touched**:
  - `turbo.json`
  - `package.json` (scripts)
- **Verification Plan**:
  - `pnpm build` succeeds with cache hits on rebuild
  - Build time reduced by >30%
- **Test Plan**:
  - Verify cache invalidation works correctly

---

## RECREATE LATER

Items that require more design work or have dependencies on other changes.

### 1. Enhance Storage, Caching, and DR Infrastructure

- **Source PR**: #15381
- **Priority**: P2 - Infrastructure
- **Risk**: High (infrastructure changes)
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Requires coordination with ops team; needs DR testing plan
- **Design Notes**: See Design Notes section below
- **Dependencies**: Redis cluster mode (#16667 merged), backup workflows

---

### 2. Add Memory Layer Package

- **Source PR**: #15356
- **Priority**: P3 - New feature
- **Risk**: Medium (new package)
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Package layout decision pending per #15380 disposition
- **Design Notes**: See Design Notes section below
- **Dependencies**: Decision on packages/memory layout

---

### 3. Add GraphQL Throughput Benchmarks

- **Source PR**: #15364
- **Priority**: P3 - Performance
- **Risk**: Low
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Need to finalize benchmark infrastructure first
- **Design Notes**: See Design Notes section below
- **Dependencies**: k6 baseline (from #15380 decomposition)

---

## BLOCKED

### 1. pnpm install / workspace sync

- **Issue**: Dependencies not installing cleanly
- **Blocking**: All package-level work
- **Status**: Investigating
- **Action**: Run `pnpm install --frozen-lockfile` and verify

---

## Design Notes

### Storage/Caching/DR (#15381)

**Problem Statement**:
Current storage layer lacks:
- Cluster mode for Redis failover
- Cross-region DR backup capabilities
- Automated recovery testing

**Proposed Approach**:
1. Option A: Redis Sentinel for HA (simpler, less resource intensive)
2. Option B: Redis Cluster with sharding (higher throughput, more complex)

**Acceptance Criteria**:
- [ ] Redis failover completes in <30s
- [ ] DR backup runs daily with verification
- [ ] Recovery drill documented and executed quarterly
- [ ] SLO: 99.9% cache availability

**Risks**:
- Migration from single Redis to cluster may require maintenance window
- DR testing requires dedicated test environment

**GA Relevance**: Required for production reliability SLO.

---

### Memory Layer Package (#15356)

**Problem Statement**:
Need in-memory caching layer with:
- LRU eviction
- TTL support
- Size-bounded storage

**Proposed Approach**:
1. Option A: Thin wrapper around lru-cache
2. Option B: Custom implementation with observability hooks

**Acceptance Criteria**:
- [ ] Memory bounded to configured max
- [ ] Hit/miss metrics exported
- [ ] TTL eviction works correctly
- [ ] No memory leaks under load

**Risks**:
- Memory profiling needed to validate bounds
- Must not impact critical path latency

**GA Relevance**: Performance optimization, not blocking GA.

---

## Merge Train Checklist

### PR Naming Convention

All salvage PRs must follow this naming:
```
salvage/pr-<source-number>-<short-slug>
```
Example: `salvage/pr-15366-express-validation`

### Required Checks

Before merge, every salvage PR must pass:
- [ ] `pnpm typecheck` - TypeScript compilation
- [ ] `pnpm lint` - ESLint/Prettier
- [ ] `pnpm test` - Unit tests
- [ ] CI workflow green

### Required Ledger Updates

When creating a salvage PR, update this document:
1. Move item from RECREATE NOW to COMPLETED
2. Add `files_changed` list
3. Add `tests_added` summary
4. Add `commands_run` with results
5. Add any `risks_notes` discovered

### Definition of Done

A salvage PR is complete when:
- [ ] Source PR cited in description: "Recreates #XXXX"
- [ ] Minimal diff - one concern only
- [ ] All required checks pass
- [ ] Verification commands documented and pass
- [ ] Tests added for regression prevention
- [ ] This ledger updated with completion evidence

---

## Completed

_(Items move here after PR merged)_

---

## Unblocker PRs

_(PRs that fix blocking gates, not feature work)_

---

## Failure Mode Patterns

### Pattern: pnpm install issues

**Symptom**: Dependency resolution failures, missing peer deps
**Root Cause Hypothesis**: Lockfile drift or workspace protocol mismatch
**Immediate Containment**: `pnpm install --no-frozen-lockfile && pnpm install --frozen-lockfile`
**Longer-term Fix**: Add lockfile validation to CI

### Pattern: TypeScript strict mode errors

**Symptom**: New packages fail typecheck
**Root Cause Hypothesis**: Missing type declarations in dependencies
**Immediate Containment**: Add explicit `@types/*` packages
**Longer-term Fix**: Require typecheck in package template

---

## Next Queue

The next 3 closed PRs to recreate after current batch:

1. **#15377** - Prepare MVP-4 release for general availability (GA docs/release)
2. **#15374** - Fix Global Search accessibility & remove jQuery remnants (UX)
3. **#15375** - Release Automation & Evidence Bundle (CI/Release)

---

_Last updated: 2026-01-26 by merge train automation_
