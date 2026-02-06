# Deferred Backlog Summary

**Generated:** 2026-02-06
**Purpose:** Consolidated view of all deferred backlog items with prioritization recommendations

## Priority Legend
- **P0**: Security-critical, should be addressed immediately
- **P1**: Important for stability/compliance, address in next sprint
- **P2**: Nice-to-have, address when capacity allows
- **P3**: Future/research items

---

## P0: Security-Critical (Immediate)

### 1. n8n Credential Rotation
- **File**: `threat-intel-backlog-2026-01-22.md`
- **Status**: Runbook created, awaiting DevOps execution
- **Action**: Execute `runbooks/n8n-credential-rotation.md`

---

## P1: Ready to Implement (Next Sprint)

### 2. Shai-Hulud Supply Chain Security ✅ COMPLETED
- **File**: `shai-hulud-supply-chain.yaml`
- **Status**: ✅ **COMPLETED (2026-02-06)**
- **Items Completed**:
  - ✅ Subsumption bundle verifier + fixtures (`tools/verify-subsumption-bundle.py`, `test/fixtures/subsumption/`)
  - ✅ Deny-by-default npm lifecycle script policy gate (`.npmrc`, `policy/npm-lifecycle-allowlist.json`)
- **Artifacts**:
  - `tools/verify-subsumption-bundle.py` - Python verifier for subsumption bundles
  - `test/fixtures/subsumption/` - Test fixtures (valid/invalid bundles)
  - `scripts/ci/verify-npm-lifecycle.sh` - CI verification script
  - `policy/npm-lifecycle-allowlist.json` - Reviewed package allowlist

### 3. Branch Protection as Code
- **File**: `branch-protection-as-code.yaml`
- **Status**: Blocked on admin token + org policy alignment
- **Item**: Org-wide enforcement across all repos
- **Recommendation**: Coordinate with governance team

---

## P2: Blocked on Dependencies

### 4. MCP Apps
- **File**: `mcp-apps.yaml`
- **Items**:
  - Real adapter implementation (needs security audit)
  - Signature key management (pending infra)
- **Recommendation**: Schedule security audit, coordinate with infra team

### 5. Ingress-NGINX Retirement
- **File**: `ingress-nginx-retirement.yaml`
- **Items**:
  - Gateway API scaffold generator (Lane 2 constraint)
  - Cluster inventory exporter (pending platform access)
  - Controller selection matrix (needs owner sign-off)
  - Rollout automation (pending ops readiness)
- **Recommendation**: Requires cross-team coordination

### 6. Subsumption Bundle Framework ✅ COMPLETED
- **File**: `subsumption-bundle-framework.yaml`
- **Status**: ✅ **COMPLETED (2026-02-06)**
- **Items Completed**:
  - ✅ Scheduled drift monitor workflow (`.github/workflows/subsumption-drift.yml`)
  - ✅ API-based required-check discovery automation (`.github/workflows/required-checks-discovery.yml`, `scripts/ci/discover-required-checks.sh`)

---

## P3: Future/Research

### 7. Graph Hybrid
- **File**: `graph-hybrid.yaml`
- **Items**:
  - Hybrid retrieval adapter (innovation lane)
  - AWS Bedrock GraphRAG adapter (avoid cloud coupling during GA)
- **Recommendation**: Keep deferred during GA hardening

### 8. Expectation Baselines
- **File**: `expectation-baselines.yaml`
- **Items**:
  - Cross-layer time-slice alignment engine (not required for MWS)
  - Confidence elasticity + survivability scoring (innovation lane)
- **Recommendation**: Innovation lane items, low priority

### 9. Claim-Level GraphRAG
- **File**: `claim-level-graphrag.yaml`
- **Items**:
  - Claim-level graph provenance adapters (Lane 2 feature)
- **Recommendation**: Keep deferred

### 10. Automation Turns 3 & 6
- **Files**: `automation-turn-3.yaml`, `automation-turn-6.yaml`
- **Items**:
  - Ingest real ITEM claims + APIs
- **Recommendation**: Foundation phase focus, keep deferred

### 11. Item Missing/Unknown
- **Files**: `item-missing.yaml`, `item-unknown.yaml`
- **Items**:
  - ITEM-specific claim registry, eval harness, drift detection
- **Recommendation**: Awaiting source excerpts, keep deferred

---

## Summary by Priority

| Priority | Count | Action |
|----------|-------|--------|
| P0 | 1 | Execute runbook immediately |
| P1 | 0 | ~~1~~ → 0 (branch-protection blocked on admin token) |
| P2 | 2 | ~~3~~ → 2 (subsumption-bundle-framework completed) |
| P3 | 5 | Keep deferred |

## Changes Made (2026-02-06)

### Session 1 (Earlier)
1. **Unblocked**: shai-hulud-supply-chain (required checks discovery completed)
2. **Documented**: n8n credential rotation runbook created
3. **CVEs Resolved**: All 4 previously ignored CVEs addressed
4. **OPA Gaps Fixed**: CompanyOS tenant-api now has OPA integration

### Session 2
5. **COMPLETED**: Shai-Hulud supply chain security items
   - Subsumption bundle verifier + test fixtures
   - Deny-by-default npm lifecycle script policy gate
6. **COMPLETED**: OPA gaps for Maestro and background jobs
   - Maestro authz middleware now fail-closed in production
   - Created OPA job wrapper for BullMQ processors
   - Added OPA policy for job authorization

### Session 3
7. **COMPLETED**: Golden path hardening items (BB-004, BB-005)
   - BB-004: Smoke test timeout now configurable via `SMOKE_TIMEOUT` env var (default 60s)
   - BB-005: Health check results now written to `health-check-results.json`
8. **REMOVED**: Deprecated `ingestion.processor.ts` stub
   - Updated job.manager.ts to use real `ingestionProcessor.ts`
   - Updated tests to mock OPA wrapper
9. **UPDATED**: OPA job wrapper adoption complete (6 processors wrapped)

### Session 4
10. **FIXED**: TypeScript strict type errors (20 errors resolved)
    - Express `req.params` string casts (16 files total)
    - Connector `writeRecords` implementations (7 files)
    - Duplicate property removal (config.ts)
    - ProviderId fixes (nvidia-nim.ts)
    - Missing property additions (ChaosController)
    - Implicit any type fixes (5 files)
    - Error count: 237 → 217 (20 fixed)

### Session 5 (Current)
11. **COMPLETED**: All remaining TypeScript errors fixed
    - provenance-beta.ts: 10 `req.params` string casts
    - TypeScript compilation: ✅ Exit code 0 (no errors)
    - Total errors fixed: 237 → 0

---

## Next Steps

1. DevOps: Execute n8n credential rotation runbook (P0)
2. Governance Team: Align on branch-protection-as-code requirements (P1)
3. Security Team: Schedule MCP apps security audit (P2)
