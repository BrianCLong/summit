# CI Gate Definitions

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **SOC 2 Controls**: CC7.1, CC7.2, CC8.1

## Overview

This document defines the CI hard gates that MUST pass before any code can be merged to main. These gates are non-negotiable and are enforced via GitHub Actions workflow.

## Gate Definitions

### Gate 1: ESLint (Code Quality)

**Workflow Job**: `lint`
**Timeout**: 15 minutes
**Failure Mode**: Block merge

**Criteria**:

- Zero ESLint errors
- Warnings < 50 (soft limit)
- No new suppressions beyond baseline

**Commands**:

```bash
npm run lint
```

**SOC 2 Control**: CC7.1 (System change detection)

---

### Gate 2: TypeScript (Type Safety)

**Workflow Job**: `typecheck`
**Timeout**: 15 minutes
**Failure Mode**: Block merge

**Criteria**:

- Zero type errors
- Strict mode enabled
- No @ts-ignore without justification

**Commands**:

```bash
npm run typecheck
```

**SOC 2 Control**: CC7.3 (System changes evaluated)

---

### Gate 3: Build (Compilation)

**Workflow Job**: `build`
**Timeout**: 20 minutes
**Failure Mode**: Block merge

**Criteria**:

- Build completes successfully
- Build artifacts generated (client/dist, server/dist)
- Bundle sizes within limits

**Commands**:

```bash
npm run build
```

**SOC 2 Control**: CC7.4 (System changes tested)

---

### Gate 4: Unit Tests (Core Functionality)

**Workflow Job**: `test-unit`
**Timeout**: 30 minutes
**Failure Mode**: Block merge

**Criteria**:

- Zero test failures
- Coverage >= 80% (statements, branches, functions, lines)
- All tests deterministic (no flaky tests)

**Commands**:

```bash
npm run test -- --coverage
```

**Coverage Thresholds**:
| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

**SOC 2 Control**: CC7.4 (System changes tested)

---

### Gate 5: Governance Tests

**Workflow Job**: `test-governance`
**Timeout**: 15 minutes
**Failure Mode**: Block merge

**Criteria**:

- All governance bypass tests pass
- GovernanceVerdict enforcement verified
- Provenance validation tests pass

**Test Files**:

- `governance/__tests__/ga-enforcement.test.ts`
- `ai/copilot/__tests__/governance.bypass.test.ts`
- `governance/__tests__/PolicyEngine.test.ts`

**Commands**:

```bash
npm test -- --testPathPattern="governance" --bail
```

**SOC 2 Control**: CC6.1, CC7.2 (Access controls, change authorization)

---

### Gate 6: Provenance Tests

**Workflow Job**: `test-provenance`
**Timeout**: 20 minutes
**Failure Mode**: Block merge

**Criteria**:

- Minimum 10 provenance tests pass
- Export snapshot tests pass
- Data envelope integrity verified

**Test Files**:

- `governance/__tests__/export-provenance-snapshot.test.ts`
- `**/provenance*.test.ts`

**Commands**:

```bash
npm test -- --testPathPattern="provenance" --bail
```

**SOC 2 Control**: PI1.1, PI1.4 (Data processing controls)

---

### Gate 7: Schema Diff

**Workflow Job**: `schema-diff`
**Timeout**: 10 minutes
**Failure Mode**: Block merge (on breaking changes)

**Criteria**:

- No breaking API schema changes without version bump
- GraphQL schema validated
- Database schema migrations applied

**Commands**:

```bash
npm run graphql:schema:check
npm run db:pg:status
```

**SOC 2 Control**: CC7.1 (System change detection)

---

### Gate 8: Security

**Workflow Job**: `security`
**Timeout**: 15 minutes
**Failure Mode**: Block merge

**Criteria**:

- Zero critical vulnerabilities
- High vulnerabilities < 5
- No secrets detected in codebase

**Tools**:

- npm audit
- TruffleHog (secret detection)
- Trivy (vulnerability scanning)

**Commands**:

```bash
npm audit --audit-level=high --production
```

**SOC 2 Control**: CC6.1, CC6.6 (Access controls, sensitive data protection)

---

## Merge-Safe Artifact

When all gates pass, a merge-safe artifact is generated:

**Artifact Name**: `merge-safe-artifact.json`

**Contents**:

```json
{
  "artifact_version": "1.0",
  "generated_at": "2025-12-27T12:00:00Z",
  "commit_sha": "abc123...",
  "gates_passed": true,
  "gates": {
    "lint": { "status": "success" },
    "typecheck": { "status": "success" },
    "build": { "status": "success" },
    "test_unit": { "status": "success" },
    "test_governance": { "status": "success" },
    "test_provenance": { "status": "success" },
    "schema_diff": { "status": "success" },
    "security": { "status": "success" }
  },
  "soc2_controls": {
    "CC7.1": "System change detection via CI gates",
    "CC7.2": "System change management via required status checks",
    "CC8.1": "Change authorization via PR approval + CI gates"
  }
}
```

**Retention**: 90 days

---

## Branch Protection Rules

Configure in GitHub repository settings:

1. Require pull request before merging
2. Require status checks to pass:
   - `Gate 1: ESLint`
   - `Gate 2: TypeScript`
   - `Gate 3: Build`
   - `Gate 4: Unit Tests`
   - `Gate 5: Governance`
   - `Gate 6: Provenance`
   - `Gate 7: Schema Diff`
   - `Gate 8: Security`
   - `Generate Merge-Safe Artifact`
3. Require conversation resolution
4. Require linear history
5. Do not allow bypassing settings
