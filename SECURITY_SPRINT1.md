# Security Sprint 1 - Progress Tracker

**Branch**: `security/tooling-foundation-2026-01-19`
**Status**: IN PROGRESS
**Started**: 2026-01-19

---

## Mission

Execute Security Sprint 1: Eliminate/triage Dependabot vulnerabilities and reduce code scanning alerts.

**Goals**:

- 0 Critical/High Dependabot vulnerabilities (or documented exceptions)
- Code scanning alerts reduced materially
- CI prevents new Critical/High vulnerabilities from merging

---

## PR Queue

### ✅ PR-1: Security Tooling Foundation

**Status**: READY FOR COMMIT
**Branch**: `security/tooling-foundation-2026-01-19`

**Changes**:

1. ✅ Created `scripts/security/triage.md` - Comprehensive triage documentation
   - Triage process and decision tree
   - Dependency upgrade procedures
   - Code scanning alert handling (true positives vs false positives)
   - Suppression guidelines with examples
   - Documentation requirements

2. ✅ Created `scripts/security/scanner-delta.sh` - Scanner delta reporting tool
   - Compare before/after scan results
   - Support for multiple formats (markdown, JSON, console)
   - Severity breakdown (Critical, High, Medium, Low)
   - Fail-on-new option for CI gates

3. ✅ Enhanced `.github/workflows/_reusable-ci-security.yml`
   - Added dependency vulnerability audit step
   - Fail on Critical/High severity vulnerabilities
   - Respects `pnpm.auditConfig.ignoreCves` exceptions
   - Upload vulnerability reports as CI artifacts

4. ✅ Created `SECURITY_SPRINT1_BASELINE.md` - Baseline inventory and PR plan

**Security Impact**:

- **Prevention**: CI now blocks PRs with new Critical/High dependency vulnerabilities
- **Visibility**: Scanner delta reports show security posture changes
- **Process**: Triage documentation standardizes vulnerability handling
- **Compliance**: All suppressions require narrow scope + justification

**Tests**:

- Workflow syntax validated (will run on push)
- Scanner delta script tested manually (see examples below)
- Triage documentation reviewed for completeness

**Rollback Plan**:
If CI fails unexpectedly, revert `.github/workflows/_reusable-ci-security.yml` changes via:

```bash
git revert <commit-sha>
```

---

### ⏭️ PR-2: TypeScript Configuration Fix

**Status**: PLANNED
**Branch**: `security/typescript-fix-2026-01-19`

**Scope**: Fix missing type definitions blocking build

**Files**:

- `package.json` - Add missing @types packages or remove if unused
- Review workspace tsconfig.json files

**Current Issue**:

```
error TS2688: Cannot find type definition file for 'hapi__catbox'.
error TS2688: Cannot find type definition file for 'hapi__shot'.
```

**Action**: Investigate if @types/hapi\_\_catbox and @types/hapi\_\_shot are actually needed or can be removed.

---

### ⏭️ PR-3: Safe Dependency Updates

**Status**: PLANNED
**Branch**: `security/safe-deps-2026-01-19`

**Scope**: Update low-risk patch/minor version dependencies

**Packages** (~15):

- @types/node: 25.0.3 → 25.0.9
- body-parser: 2.2.1 → 2.2.2
- eventemitter3: 5.0.1 → 5.0.4
- vitest: 4.0.16 → 4.0.17
- zustand: 5.0.9 → 5.0.10
- TypeScript ESLint: 8.50.1 → 8.53.0
- pino: 10.1.0 → 10.2.1
- pg: 8.16.3 → 8.17.1
- ioredis: 5.8.2 → 5.9.2
- prettier: 3.7.4 → 3.8.0
- supertest: 7.1.4 → 7.2.2
- zod: 4.2.1 → 4.3.5

**Tests**: Full test suite + typecheck + lint

---

### ⏭️ PR-4: Deprecated Package Documentation

**Status**: PLANNED

**Scope**: Document deprecated packages and migration plans

**Deprecated**:

1. **apollo-server-express** (3.13.0) - HIGH RISK
   - CVE-2022-24434 in transitive dep (dicer)
   - Migration plan: Apollo Server v4 (Q1 2026)
   - Blockers: GraphQL schema refactoring required

2. **@types/hapi\_\_catbox**, **@types/hapi\_\_shot** - LOW RISK
   - Action: Remove if unused, or find replacement

3. **@types/minimatch**, **@types/uuid** - LOW RISK
   - Action: Use built-in types if available

**Deliverable**: `docs/security/DEPRECATED_PACKAGES.md`

---

### ⏭️ PR-5: Major Dependency Updates

**Status**: PLANNED

**Scope**: Update major version dependencies (testing required)

**Packages**:

- @commitlint/cli: 19.8.1 → 20.3.1
- @commitlint/config-conventional: 19.8.1 → 20.3.1
- @semantic-release/github: 11.0.6 → 12.0.2

**Tests**: Verify commitlint and semantic-release workflows

---

### ⏭️ PR-6: CVE Justification Documentation

**Status**: PLANNED

**Scope**: Document all ignored CVEs per SECURITY.md requirements

**CVEs to Document**:

- CVE-2024-22363 - [Justification needed]
- CVE-2023-30533 - [Justification needed]
- CVE-2023-28155 - [Justification needed]
- CVE-2022-24434 - [Already documented - verify completeness]

**Template**: Use format from `scripts/security/triage.md`

---

### ⏭️ PR-7+: Code Scanning Alert Remediation

**Status**: PLANNED

**Strategy**:

1. Retrieve alerts: `gh api repos/BrianCLong/summit/code-scanning/alerts`
2. Group by category (XSS, SQL injection, path traversal, etc.)
3. Fix true positives first with security tests
4. Add narrow suppressions for false positives with justification
5. One PR per major category

**Expected**: ~5,000 alerts → Reduce to <500 (90% reduction target)

---

## Acceptance Criteria

### Must Have (P0)

- [x] Baseline inventory completed
- [x] PR series breakdown documented
- [x] Security triage documentation created
- [x] CI gate for Critical/High vulnerabilities implemented
- [ ] TypeScript build passes (PR-2)
- [ ] 0 Critical Dependabot vulnerabilities
- [ ] 0 High Dependabot vulnerabilities (or documented exceptions)

### Should Have (P1)

- [ ] Code scanning alerts reduced by 50%+
- [ ] All suppressions narrowly scoped with justification
- [ ] Scanner delta reporting in CI artifacts
- [ ] Deprecated packages documented

### Nice to Have (P2)

- [ ] Medium Dependabot vulnerabilities triaged
- [ ] Security metrics automation
- [ ] Automated remediation PRs

---

## Next Actions

1. ✅ Implement PR-1: Security tooling foundation
2. ⏭️ Commit PR-1 changes
3. ⏭️ Push PR-1 branch
4. ⏭️ Create PR-1 pull request
5. ⏭️ Implement PR-2: TypeScript fix

---

## Notes

- All PRs use branch naming: `security/<topic>-<date>`
- Each PR includes: tests (or rationale), updated lockfiles, Security Impact note
- Keep changes atomic - no mega-PRs
- Build must stay green at all times

---

**Last Updated**: 2026-01-19
