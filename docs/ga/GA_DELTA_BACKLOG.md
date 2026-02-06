# GA Delta Backlog

**Generated:** 2026-02-06
**Purpose:** Track all gaps between current state and GA readiness

---

## Delta Items

| ID  | Gate      | Symptom                                          | Root Cause                               | Proposed Fix                                          | Evidence Needed               | Risk | Size | Status |
| --- | --------- | ------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------- | ----------------------------- | ---- | ---- | ------ |
| D1  | Build     | 18 files have merge conflict markers (`<<<<<<<`) | Incomplete merge from PR #17022          | Resolve all conflict markers, pick correct version    | Clean `git grep` output       | HIGH | M    | OPEN   |
| D2  | Lint      | 393 Python lint errors (Ruff)                    | Style drift, import sorting              | Run `ruff check --fix .`                              | Zero Ruff errors              | LOW  | S    | OPEN   |
| D3  | CI Parity | Lockfile was out of sync                         | Dependency added without lockfile update | Already fixed during install; commit updated lockfile | Lockfile matches package.json | LOW  | S    | DONE   |
| D4  | Docs      | RECAPTURE_STATE.md needs Phase 1 update          | In progress                              | Complete Phase 1 documentation                        | Document exists               | LOW  | S    | DONE   |

---

## Detailed Analysis

### D1: Merge Conflict Markers (CRITICAL)

**Files Affected (18):**

```
.ci/required_checks.todo.md
.github/workflows/golden-path-e2e.yml
RUNBOOKS/e2e_golden_path.md
e2e/golden-path/README.md
e2e/golden-path/fixtures/test_users.json
e2e/golden-path/package.json
e2e/golden-path/pages/DashboardPage.ts
e2e/golden-path/pages/LoginPage.ts
e2e/golden-path/playwright.config.ts
e2e/golden-path/tests/golden_path.spec.ts
e2e/golden-path/tests/policy_redaction.spec.ts
e2e/golden-path/tests/smoke.spec.ts
scripts/ci/detect_package_manager.sh
scripts/ci/evidence_write.mjs
scripts/ci/redaction_scan.sh
scripts/ci/run_golden_path_e2e.sh
scripts/ci/start_consolidated_frontend.sh
scripts/enhanced_autohealing.sh
```

**Origin:** Merge conflict from commit `50f8d7925a` (feat: add golden path E2E test harness for consolidated frontend)

**Resolution Strategy:**

1. Review each file to understand both sides of the conflict
2. Choose the correct resolution (likely the incoming changes from the feature branch)
3. Remove all conflict markers
4. Verify files are syntactically valid
5. Run relevant tests

**Acceptance Criteria:**

- `git grep -l "<<<<<<<"` returns empty
- `pnpm typecheck` passes
- Affected workflow files are valid YAML

---

### D2: Python Lint Errors (LOW PRIORITY)

**Error Categories:**

- I001: Import block sorting (majority)
- UP006: Use `list` instead of `List` type annotation
- Other minor style issues

**Resolution:**

```bash
ruff check --fix .
ruff format
```

**Acceptance Criteria:**

- `ruff check .` returns 0 errors
- No functional changes to code

---

### D3: Lockfile Sync (RESOLVED)

**Issue:** `pnpm-lock.yaml` was missing specifier for `typescript@^5.0.0` in `packages/cogsec-model/package.json`

**Resolution:** Fixed during `pnpm install` - lockfile updated

**Evidence:** Lockfile committed in Phase 0 commit `75b95e13a`

---

## Priority Order

1. **D1** - Merge conflicts (blocking - will break builds)
2. **D2** - Python lint (non-blocking but should be clean)

---

## Notes

- Docker-dependent gates (smoke tests, full GA) cannot be run locally
- Will need CI environment to verify full GA gate pass
- Consider creating offline-verifiable subset of GA checks

---

_Backlog created as part of GA Recapture Phase 2._
