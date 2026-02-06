# PR Train Plan

**Generated:** 2026-02-06
**Purpose:** Ordered atomic PR train to achieve GA readiness

---

## PR Sequence

| Order | PR Title                                                 | Delta ID | Touched Paths                      | Acceptance Checks                                 | Evidence Bundle                      | Rollback Plan |
| ----- | -------------------------------------------------------- | -------- | ---------------------------------- | ------------------------------------------------- | ------------------------------------ | ------------- |
| 1     | fix: resolve merge conflict markers from golden-path E2E | D1       | 18 files (see below)               | `git grep "<<<<<<<"` empty, `pnpm typecheck` pass | `evidence/pr-1-conflict-resolution/` | `git revert`  |
| 2     | chore: fix Python lint errors (ruff auto-fix)            | D2       | `tools/**/*.py`, `scripts/**/*.py` | `ruff check .` returns 0                          | `evidence/pr-2-ruff-fix/`            | `git revert`  |

---

## PR 1: Resolve Merge Conflict Markers

### Scope

Fix all 18 files with merge conflict markers from PR #17022.

### Files to Touch

**CI/Workflow:**

- `.ci/required_checks.todo.md`
- `.github/workflows/golden-path-e2e.yml`

**Documentation:**

- `RUNBOOKS/e2e_golden_path.md`
- `e2e/golden-path/README.md`

**E2E Test Framework:**

- `e2e/golden-path/fixtures/test_users.json`
- `e2e/golden-path/package.json`
- `e2e/golden-path/pages/DashboardPage.ts`
- `e2e/golden-path/pages/LoginPage.ts`
- `e2e/golden-path/playwright.config.ts`
- `e2e/golden-path/tests/golden_path.spec.ts`
- `e2e/golden-path/tests/policy_redaction.spec.ts`
- `e2e/golden-path/tests/smoke.spec.ts`

**CI Scripts:**

- `scripts/ci/detect_package_manager.sh`
- `scripts/ci/evidence_write.mjs`
- `scripts/ci/redaction_scan.sh`
- `scripts/ci/run_golden_path_e2e.sh`
- `scripts/ci/start_consolidated_frontend.sh`
- `scripts/enhanced_autohealing.sh`

### Acceptance Criteria

1. `git grep -l "<<<<<<<"` returns empty (excluding node_modules)
2. `pnpm typecheck` passes
3. All affected YAML files are valid (`yq` or equivalent)
4. `pnpm lint` does not regress

### Evidence Bundle Checklist

- [ ] `commands.txt` - exact commands run
- [ ] `logs/conflict-check.log` - before/after grep output
- [ ] `logs/typecheck.log` - typecheck output
- [ ] Diff of each resolved file

### Rollback

```bash
git revert <commit-sha>
```

---

## PR 2: Fix Python Lint Errors

### Scope

Auto-fix all 393 Ruff lint errors.

### Commands

```bash
ruff check --fix .
ruff format
```

### Files to Touch

Primarily:

- `tools/solid_gate/*.py`
- `tools/*.py`
- `scripts/evidence/*.py`
- `verification/*.py`

### Acceptance Criteria

1. `ruff check .` returns 0 errors
2. No functional changes (only formatting/imports)
3. All Python tests still pass

### Evidence Bundle Checklist

- [ ] `commands.txt` - exact commands run
- [ ] `logs/ruff-before.log` - error count before
- [ ] `logs/ruff-after.log` - error count after (should be 0)

### Rollback

```bash
git revert <commit-sha>
```

---

## Execution Notes

1. Each PR should be created, tested, and merged before starting the next
2. After PR 1, re-run `pnpm typecheck` and `pnpm lint` to verify no regressions
3. After PR 2, run `ruff check .` to confirm zero errors
4. Update `docs/ga/RECAPTURE_STATE.md` after each PR with results

---

## Post-Train Verification

After all PRs are merged:

```bash
# Verify no conflict markers
git grep -l "<<<<<<<"  # should return empty

# Verify typecheck
pnpm typecheck

# Verify lint
pnpm lint
ruff check .

# Verify tests
pnpm test:unit

# Run GA verify (will partially fail without Docker)
pnpm ga:verify
```

---

_PR Train Plan created as part of GA Recapture Phase 2._
