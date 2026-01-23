# Governance Controls Update - 2026-01-23

## Summary

This update documents the TypeScript Gate infrastructure and root-level typecheck investigation findings.

## Changes Made

### TypeScript CI Gates

1. **Server TypeScript Gate** (PR #16625 - MERGED)
   - Script: `scripts/ci/server_typecheck_report.mjs`
   - Workflow: `.github/workflows/server-typecheck.yml`
   - Status: 0 app code errors (CI passing)

2. **Client TypeScript Gate** (PR #16631 - MERGED)
   - Script: `scripts/ci/client_typecheck_report.mjs`
   - Workflow: `.github/workflows/client-typecheck.yml`
   - Config: `client/tsconfig.strict.json` (excludes test files)
   - Status: 0 errors (CI passing)

### Root Typecheck Investigation (Issue #16632 - CLOSED)

Investigated root-level `tsc -b` failures and documented findings:

- **Hapi stub packages**: Added empty `index.d.ts` files to satisfy TypeScript
- **Cross-package conflicts**: DOM vs React Native type collisions
- **Deprecated @types packages**: Multiple incompatibilities with actual packages
- **Recommendation**: Maintain scoped per-package CI gates rather than root-level gate

### Dead Code Identified

Two duplicate files with corrupted formatting discovered:

- `server/src/middleware/advanced-query-security.ts` (malformed)
- `server/src/security/advanced-query-security.ts` (proper)
- Neither file is imported anywhere - recommend removal

## Enforcement Artifacts

| Artifact             | Location                                           | CI Gate                                  |
| -------------------- | -------------------------------------------------- | ---------------------------------------- |
| Server typecheck     | `scripts/ci/server_typecheck_report.mjs`           | `.github/workflows/server-typecheck.yml` |
| Client typecheck     | `scripts/ci/client_typecheck_report.mjs`           | `.github/workflows/client-typecheck.yml` |
| Stabilization report | `scripts/release/generate_stabilization_report.sh` | Evidence collection workflow             |

## How to Verify Locally

```bash
# Run client typecheck (should pass with 0 errors)
node scripts/ci/client_typecheck_report.mjs

# Run server typecheck (reports dead code errors)
node scripts/ci/server_typecheck_report.mjs

# Generate stabilization report
./scripts/release/generate_stabilization_report.sh --json-summary
```

## Self-Audit

### Determinism

- [x] TypeScript reports use deterministic sorting (file > line > col > code)
- [x] No timestamps in deterministic output sections
- [x] Error keys computed deterministically for baseline comparison

### Documentation

- [x] All governance primitives map to enforcement artifacts
- [x] No ungrounded vendor claims
- [x] Testable language throughout

### CI Integration

- [x] Workflows named clearly (`server-typecheck`, `client-typecheck`)
- [x] Path-based triggers for efficiency
- [x] Fail-fast on new regressions
- [x] Artifacts uploaded on failure for debugging

## Open Items

1. **P2**: Remove duplicate `advanced-query-security.ts` files (dead code)
2. **P3**: Consider per-package typecheck gates for mobile/packages/services

---

**Report Version:** 1.0.0
**Generated:** 2026-01-23T03:30:00Z
