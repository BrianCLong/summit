# PR Merge Ledger

**Last Updated**: 2025-12-31
**Repository**: BrianCLong/summit
**Current Branch**: claude/normalize-pr-backlog-asle5

## Executive Summary

This ledger tracks the PR backlog normalization effort, documenting recent merges, current state, and the path to a clean golden baseline.

### Current Status

- **Recent PR Activity**: High volume of merges completed (40+ PRs merged in recent weeks)
- **Open Branches**: 2 Claude branches only (no visible PR backlog)
- **Baseline State**: ⚠️ **BLOCKED** - Critical dependency installation issues
- **CI/CD State**: Unknown (pending baseline fixes)

### Critical Baseline Blockers

| Blocker                    | Severity    | Status      | Next Action                      |
| -------------------------- | ----------- | ----------- | -------------------------------- |
| pnpm install failure       | 🔴 CRITICAL | In Progress | Complete dependency installation |
| Missing node_modules       | 🔴 CRITICAL | In Progress | Verify pnpm install completes    |
| ESLint missing @eslint/js  | 🔴 CRITICAL | Blocked     | Fix after install                |
| TypeScript missing modules | 🔴 CRITICAL | Blocked     | Fix after install                |
| xlsx CDN 503 errors        | 🟡 MEDIUM   | Observed    | May need fallback strategy       |

---

## Recent PR Activity (Last 30 Days)

### Dependency Updates (Merged)

| PR     | Title                                                           | Type       | Risk   | Merged |
| ------ | --------------------------------------------------------------- | ---------- | ------ | ------ |
| #15184 | chore(deps): bump docker/setup-buildx-action from 2 to 3        | Dependency | Low    | ✅     |
| #15183 | chore(deps): bump snyk/actions from 0.4.0 to 1.0.0              | Dependency | Low    | ✅     |
| #15182 | chore(deps): bump actions/upload-artifact from 4 to 6           | Dependency | Low    | ✅     |
| #15181 | chore(deps): bump github/codeql-action from 3 to 4              | Dependency | Low    | ✅     |
| #15180 | chore(deps): bump zaproxy/action-baseline from 0.14.0 to 0.15.0 | Dependency | Low    | ✅     |
| #15179 | chore(deps): bump notify from 6.1.1 to 8.2.0                    | Dependency | Medium | ✅     |

### Feature/Security PRs (Merged)

| PR     | Title                                                                               | Scope      | Risk     | Merged |
| ------ | ----------------------------------------------------------------------------------- | ---------- | -------- | ------ |
| #15175 | feat(security): add webhook signature verification for Jira and Lifecycle endpoints | Security   | Medium   | ✅     |
| #15174 | Agentic RAG Pilot API Implementation                                                | Feature/AI | High     | ✅     |
| #15173 | Partner Console v1 and Evidence Export                                              | Feature    | High     | ✅     |
| #15172 | Prepare Summit MVP for general availability                                         | Release    | Critical | ✅     |

### CI/Build Fixes (Merged - No PR Number)

| Commit   | Title                                                                        | Type     | Impact |
| -------- | ---------------------------------------------------------------------------- | -------- | ------ |
| 214be84c | fix(ops): add AI Copilot service alert policies                              | Ops      | Low    |
| 6db38ec2 | fix(server): add explicit jest global declaration for ESLint                 | CI/Build | Medium |
| 6767f32b | fix(server): add eslint-env jest directive to jest.setup.js                  | CI/Build | Low    |
| 65601aff | fix(server): add global mocks for ESM packages in Jest setup                 | CI/Build | Medium |
| 860a6f0c | fix(test): add node-fetch and opentelemetry to Jest ESM transform patterns   | CI/Build | Medium |
| 3b05093e | fix(ci): mark non-blocking jobs with continue-on-error                       | CI       | Low    |
| 9c7489e8 | fix(ci): add fetch-depth for schema-diff workflow                            | CI       | Low    |
| 8ac5c3a1 | fix(ci): resolve Makefile syntax, GraphQL schema, and provenance tests       | CI       | High   |
| 822b3281 | fix(ci): resolve ESM/CJS issues in root jest setup and add graphql-inspector | CI/Build | High   |

### GA Preparation PRs (Merged - 14xxx series)

| PR            | Title                                                | Category    | Risk   |
| ------------- | ---------------------------------------------------- | ----------- | ------ |
| #14860        | Enforce tenant context on critical routes            | Security    | High   |
| #14863        | Add connector conformance checklist and harness      | Quality     | Medium |
| #14866        | Add usage ledger for receipt ingestion flow          | Feature     | Medium |
| #14869        | chore: improve local dev bootstrap reliability       | DevEx       | Low    |
| #14871        | Add receipt performance benchmark and budget         | Performance | Low    |
| #14872        | Add receipt ingestion contract test coverage         | Testing     | Low    |
| #14874-#14911 | GA preparation work (docs, planning, features)       | Mixed       | Mixed  |
| #14915-#14985 | Additional GA work (hardening, compliance, features) | Mixed       | Mixed  |

---

## Current Branch Analysis

### Claude Branches

| Branch                                  | Purpose                                | Status            | Files Changed | Notes                       |
| --------------------------------------- | -------------------------------------- | ----------------- | ------------- | --------------------------- |
| claude/normalize-pr-backlog-asle5       | PR normalization & merge orchestration | ACTIVE            | TBD           | This session                |
| claude/deterministic-ci-execution-9OldM | CI determinism fixes                   | MERGED to current | 5 files       | Alert policies, Jest config |

---

## Golden Path Baseline Requirements

### Phase 1: Dependency Resolution (CURRENT)

**Status**: 🔴 BLOCKED

**Requirements**:

- ✅ pnpm version: 10.0.0 (specified in package.json)
- ⏳ `pnpm install` must complete without errors
- ⏳ All node_modules must be present
- ⏳ No critical dependency resolution failures
- 🟡 Handle xlsx CDN 503 gracefully (retry or fallback)

**Acceptance Criteria**:

```bash
pnpm install          # Exit code 0, all packages resolved
ls node_modules       # Directory exists and populated
pnpm list --depth 0   # No missing peer dependencies
```

### Phase 2: Lint & Type Safety

**Status**: ⏸️ PENDING (blocked by Phase 1)

**Requirements**:

- `pnpm -w lint` must pass (or have documented, tracked exceptions)
- `pnpm -w typecheck` must pass (or have documented, tracked exceptions)
- ESLint config must be valid and loadable
- No import-assign or type errors in critical paths

**Acceptance Criteria**:

```bash
pnpm -w lint       # Exit code 0 or documented exceptions
pnpm -w typecheck  # Exit code 0 or documented exceptions
```

### Phase 3: Build Verification

**Status**: ⏸️ PENDING (blocked by Phase 1 & 2)

**Requirements**:

- `pnpm -w build` (client + server) must complete
- No blocking TypeScript errors
- Build artifacts must be generated

**Acceptance Criteria**:

```bash
pnpm -w build           # Exit code 0
ls client/dist          # Build artifacts present
ls server/dist          # Build artifacts present
```

### Phase 4: Test Execution

**Status**: ⏸️ PENDING (blocked by Phase 1-3)

**Requirements**:

- `pnpm test:quick` must pass
- Core test suites must be executable (even if some fail)
- Jest setup must not have ESM/CJS conflicts

**Acceptance Criteria**:

```bash
pnpm test:quick         # Exit code 0
pnpm test:smoke         # Executable (track failures separately)
```

---

## PR Merge Buckets

### Bucket A: Merge Now (Post-Baseline)

**Criteria**: Docs-only, low risk, CI clean, no conflicts

| PR  | Title | Notes                        |
| --- | ----- | ---------------------------- |
| -   | -     | No active PRs identified yet |

### Bucket B: Rebase After Baseline

**Criteria**: Code changes, dependencies on baseline fixes

| PR  | Title | Dependencies                 |
| --- | ----- | ---------------------------- |
| -   | -     | Awaiting baseline completion |

### Bucket C: Needs Fixes Before Merge

**Criteria**: Failing CI, conflicts, or blocking issues

| PR  | Title | Issues | Next Action |
| --- | ----- | ------ | ----------- |
| -   | -     | -      | -           |

### Bucket D: Close/Supersede

**Criteria**: Duplicate, obsolete, or abandoned

| PR  | Title | Reason |
| --- | ----- | ------ |
| -   | -     | -      |

---

## Dependency Issues Log

### Issue: xlsx Package CDN 503 Errors

**Observed**: 2025-12-31
**Severity**: Medium
**Impact**: Blocks or slows pnpm install
**Source**: `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

**Retry Pattern**:

```
WARN HEAD https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz error (503). Will retry in 10 seconds. 2 retries left.
WARN GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz error (ERR_PNPM_FETCH_503). Will retry in 10 seconds. 2 retries left.
WARN GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz error (ERR_PNPM_FETCH_503). Will retry in 1 minute. 1 retries left.
```

**Mitigation Options**:

1. Wait for CDN to recover (pnpm has 3 retry attempts)
2. Use npm registry mirror for xlsx
3. Vendor the xlsx package locally
4. Update to newer xlsx version from npm registry

**Resolution**: Monitor current install attempt

### Issue: Deprecated Packages

**Observed**: Numerous deprecation warnings during install

**Notable Deprecations**:

- `@types/uuid@11.0.0` - stub types, use built-in types
- `@apollo/server@4.12.2`
- `eslint@8.57.1` (in apps/labeling-ui)
- `apollo-server-express@3.13.0`
- `csurf@1.11.0`
- `puppeteer` (multiple versions)
- And ~30+ others

**Impact**: Technical debt, potential security issues
**Next Action**: Create dependency upgrade plan (separate from merge normalization)

---

## Next Actions

### Immediate (Blocking)

1. ⏳ **Monitor pnpm install completion**
   - Check background process `5efb30`
   - Verify exit code 0
   - Confirm node_modules populated

2. 🔜 **Run baseline verification suite**

   ```bash
   pnpm -w lint
   pnpm -w typecheck
   pnpm -w build
   pnpm test:quick
   ```

3. 🔜 **Document baseline state**
   - Capture all errors/warnings
   - Categorize by severity
   - Identify minimum fixes for "golden path"

### Short-term (Post-Baseline)

4. Create PR normalization checklist
5. Create merge log template
6. Document merge execution process
7. Create "Next 10 Merges" plan (when PRs identified)

### Medium-term (Process)

8. Establish automated PR quality gates
9. Create dependency update strategy
10. Document rollback procedures
11. Set up merge train automation

---

## Evidence & Audit Trail

### Session Start State

- **Git Status**: Clean working directory
- **Current Branch**: claude/normalize-pr-backlog-asle5
- **Last Commit**: 214be84c - fix(ops): add AI Copilot service alert policies
- **Visible Branches**: 2 (both claude/)
- **Recent Activity**: High merge volume (40+ PRs in #14xxx-#15xxx range)

### Commands Executed

```bash
# 2025-12-31 21:31 UTC
git status
git log --all --oneline --graph | head -100
git branch -r

# 2025-12-31 21:35 UTC
pnpm -w install  # (background, incomplete - first attempt)

# 2025-12-31 21:36 UTC
pnpm -w lint     # FAILED - missing @eslint/js
pnpm -w typecheck # FAILED - missing modules

# 2025-12-31 21:38 UTC
pnpm install     # (background process 5efb30, monitoring)
```

---

## Appendix: Repository Structure

**Package Manager**: pnpm 10.0.0
**Node Version**: >=18.18
**Workspace Structure**: Monorepo with packages/, client/, server/

**Key Scripts** (from root package.json):

- `pnpm -w install` - Workspace install
- `pnpm -w lint` - ESLint + ruff (Python)
- `pnpm -w typecheck` - TypeScript build check
- `pnpm -w build` - Build client + server
- `pnpm test:quick` - Quick sanity check
- `pnpm test:smoke` - Smoke tests (backend + frontend)

**Workspace Members**:

- packages/\* - Shared packages
- client - Frontend application
- server - Backend application
- apps/\* - Additional applications (mobile, web, analytics, etc.)
- services/\* - Microservices

---

## Change Log

| Date       | Change                                  | Author                                |
| ---------- | --------------------------------------- | ------------------------------------- |
| 2025-12-31 | Initial ledger created                  | Claude (normalize-pr-backlog session) |
| 2025-12-31 | Added baseline blocker analysis         | Claude                                |
| 2025-12-31 | Documented recent PR activity (50+ PRs) | Claude                                |

---

**Note**: This ledger will be updated continuously as the normalization effort progresses. All changes should be committed with clear messages to maintain audit trail.
