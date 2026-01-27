# Salvage from Closed PRs Ledger

> **Canonical tracking document for GA-readiness PR recreation.**
> Updated: 2026-01-27

## Summary

| Category | Count |
|----------|-------|
| RECREATE NOW | 2 |
| RECREATE LATER | 3 |
| IN PROGRESS | 3 |
| COMPLETED | 0 |
| BLOCKED | 1 |

---

## IN PROGRESS (Branches Created)

### 1. Automate Issue Triage Labeling

- **Source PR**: #15368
- **Branch**: `salvage/pr-15368-auto-label`
- **Status**: BRANCH CREATED
- **Files Changed**:
  - `.github/workflows/pr-labeler.yml` (new - restored from archive)
- **Changes Made**:
  - Restored pr-labeler.yml from `.github/workflows/.archive/`
  - Added issue labeling support (not just PRs)
  - Added GA-readiness and salvage label detection
  - Added error handling for label application
  - Support conventional commit prefixes with scopes
- **Verification**:
  - YAML syntax validated
  - Labels defined in existing labeler.yml config
- **Tests Added**: N/A (GitHub Actions only)
- **Commands Run**: `git commit` successful

---

### 2. Enforce Coverage Gate and Add API Fuzzing

- **Source PR**: #15365
- **Branch**: `salvage/pr-15365-coverage-gate`
- **Status**: BRANCH CREATED
- **Files Changed**:
  - `.github/workflows/coverage-gate.yml` (new - restored from archive)
  - `.github/workflows/api-fuzz.yml` (new)
- **Changes Made**:
  - Restored coverage-gate.yml with improvements
  - Added api-fuzz.yml for GraphQL and REST API fuzzing
  - Coverage thresholds: 70% statements/lines, 60% branches
  - Coverage regression check blocks >2% decrease
  - Weekly scheduled fuzzing with manual trigger option
  - Auto-creates issues on fuzzing failures
- **Verification**:
  - YAML syntax validated
  - Workflow references existing test commands
- **Tests Added**: Workflows include self-test assertions
- **Commands Run**: `git commit` successful

---

### 3. Organize Workspaces with Turborepo Segmentation

- **Source PR**: #15370
- **Branch**: `salvage/pr-15370-turbo-config`
- **Status**: BRANCH CREATED
- **Files Changed**:
  - `turbo.json` (enhanced)
- **Changes Made**:
  - Enabled TUI and daemon mode for better DX
  - Added coverage task with proper caching
  - Added security:check task (uncached for freshness)
  - Added evidence:generate task for GA artifacts
  - Added clean task
  - Updated globalDependencies with eslint.config, vitest.config, .nvmrc
  - Added globalPassThroughEnv for GitHub and npm env vars
- **Verification**:
  - turbo.json validates against schema
  - Existing build/test tasks unchanged
- **Tests Added**: N/A (config only)
- **Commands Run**: `git commit` successful

---

## RECREATE NOW

Items classified as high-priority for GA readiness. Must be recreated with minimal, focused changes.

### 1. Fix TypeScript Package Type Declarations (BLOCKING GATE)

- **Source PRs**: #15391 (Include missing server sources in tsconfig), related fixes
- **Priority**: P0 - Blocking typecheck gate
- **Risk**: Low (type declarations only)
- **Status**: BLOCKED BY PNPM INSTALL
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
- **Blocker Note**: pnpm install failing with 503 errors from external registries (sheetjs, etc.)

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

## RECREATE LATER

Items that require more design work or have dependencies on other changes.

### 1. Enhance Storage, Caching, and DR Infrastructure

- **Source PR**: #15381
- **Priority**: P2 - Infrastructure
- **Risk**: High (infrastructure changes)
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Requires coordination with ops team; needs DR testing plan
- **Dependencies**: Redis cluster mode (#16667 merged), backup workflows

---

### 2. Add Memory Layer Package

- **Source PR**: #15356
- **Priority**: P3 - New feature
- **Risk**: Medium (new package)
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Package layout decision pending per #15380 disposition
- **Dependencies**: Decision on packages/memory layout

---

### 3. Add GraphQL Throughput Benchmarks

- **Source PR**: #15364
- **Priority**: P3 - Performance
- **Risk**: Low
- **Status**: NEEDS DESIGN
- **Reason for Deferral**: Need to finalize benchmark infrastructure first
- **Dependencies**: k6 baseline (from #15380 decomposition)

---

## BLOCKED

### 1. pnpm install / workspace sync

- **Issue**: Dependencies not installing cleanly (503 errors from external registries)
- **Blocking**: All package-level work (TypeScript fixes)
- **Status**: External dependency issue
- **Action**: Retry when registry issues resolve; consider adding registry mirrors

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

**Issue Template**:
```markdown
## Storage/DR Infrastructure Enhancement

### Problem
Production Redis lacks HA/failover capability. No automated DR testing.

### Proposed Solution
Implement Redis Sentinel for automatic failover with daily backup verification.

### Acceptance Criteria
- [ ] Failover time <30s (measured)
- [ ] Daily backup with SHA256 verification
- [ ] Quarterly DR drill documented
- [ ] 99.9% cache availability SLO met

### Dependencies
- #16667 (Redis cluster mode) - MERGED
- Ops team coordination for maintenance window
```

---

### Memory Layer Package (#15356)

**Problem Statement**:
Need in-memory caching layer with:
- LRU eviction
- TTL support
- Size-bounded storage

**Proposed Approach**:
1. Option A: Thin wrapper around lru-cache (recommended)
2. Option B: Custom implementation with observability hooks

**Acceptance Criteria**:
- [ ] Memory bounded to configured max
- [ ] Hit/miss metrics exported via prom-client
- [ ] TTL eviction works correctly
- [ ] No memory leaks under load (verified with --inspect)

**Risks**:
- Memory profiling needed to validate bounds
- Must not impact critical path latency (<1ms overhead)

**GA Relevance**: Performance optimization, not blocking GA.

**Issue Template**:
```markdown
## Memory Layer Package

### Problem
Services need lightweight in-memory caching with bounded memory and TTL support.

### Proposed Solution
Create `@intelgraph/memory-cache` package wrapping lru-cache with:
- Prometheus metrics (hits, misses, evictions)
- Configurable max size and TTL
- TypeScript-first API

### Acceptance Criteria
- [ ] Memory stays within configured bounds under load
- [ ] Metrics exported for observability
- [ ] TTL eviction functional
- [ ] <1ms overhead per operation

### Dependencies
- packages/ layout decision from #15380 disposition
```

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
1. Move item from RECREATE NOW to IN PROGRESS
2. Add `branch` name
3. Add `files_changed` list
4. Add `changes_made` summary
5. Add `verification` results
6. Add any `risks_notes` discovered

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

**Symptom**: Dependency resolution failures, 503 errors from registries
**Root Cause Hypothesis**: External registry issues (sheetjs CDN, npm timeouts)
**Immediate Containment**:
- Retry with exponential backoff
- Use `--prefer-offline` if possible
- Check registry status pages
**Longer-term Fix**:
- Add registry mirrors to .npmrc
- Cache dependencies in CI artifacts
- Document known flaky packages

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

## Session Evidence

### Branches Created This Session

| Branch | Source PR | Status | Files Changed |
|--------|-----------|--------|---------------|
| `salvage/pr-15368-auto-label` | #15368 | Ready for review | `.github/workflows/pr-labeler.yml` |
| `salvage/pr-15365-coverage-gate` | #15365 | Ready for review | `.github/workflows/coverage-gate.yml`, `.github/workflows/api-fuzz.yml` |
| `salvage/pr-15370-turbo-config` | #15370 | Ready for review | `turbo.json` |

### Commands Run

```bash
# Auto-labeler branch
git checkout -b salvage/pr-15368-auto-label
git add .github/workflows/pr-labeler.yml
git commit -m "ci(salvage): restore and enhance PR auto-labeler workflow"

# Coverage gate branch
git checkout -b salvage/pr-15365-coverage-gate
git add .github/workflows/coverage-gate.yml .github/workflows/api-fuzz.yml
git commit -m "ci(salvage): restore coverage gate and add API fuzzing workflow"

# Turborepo branch
git checkout -b salvage/pr-15370-turbo-config
git add turbo.json
git commit -m "build(salvage): enhance Turborepo configuration for GA readiness"
```

---

_Last updated: 2026-01-27 by merge train automation_
