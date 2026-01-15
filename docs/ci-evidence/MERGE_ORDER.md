# PR Stack Merge Order

**Document:** MERGE_ORDER.md
**Created:** 2026-01-02
**Purpose:** Unambiguous merge sequence for GA/supply-chain workflow fixes

---

## Recommended Merge Sequence

### 1. Security Hotfix PRs (if applicable)

**Branch:** N/A - Path traversal protections already exist in codebase

**Status:** VERIFIED - No duplicate implementations found

**Notes:**
- Path traversal protection exists in multiple layers (defense in depth):
  - `server/src/security/SecurityHardeningConfig.ts` - middleware protection
  - `server/src/utils/input-sanitization.ts` - sanitization utility
  - `packages/prov-manifest/src/verify.ts` - manifest verification
- No duplicate PRs found implementing the same fix
- All implementations are canonical and complementary

---

### 2. Supply-Chain/GA Workflow Fix PR (THIS PR)

**Branch:** `claude/fix-ga-workflows-1XWLL`

**Changes:**
| File | Change | Impact |
|------|--------|--------|
| `.github/workflows/ci.yml` | Fix `@v6` -> `@v4` | Unblocks verify and ecosystem-exports jobs |
| `.github/workflows/a11y-keyboard-smoke.yml` | Fix `@v6` -> `@v4` | Unblocks a11y gate |
| `.github/workflows/docker-build.yml` | Pin Trivy to SHA | Supply chain compliance |
| `.github/workflows/golden-path/_golden-path-pipeline.yml` | Pin Trivy to SHA | Supply chain compliance |
| `.github/workflows/reusable-golden-path.yml` | Update Docker actions v2->v3, v4->v5 | Stability & security |

**Merge Prerequisites:**
1. CI passes on this branch
2. No merge conflicts with main

**Post-Merge Actions:**
1. Verify all workflow runs are green on main
2. Update CI_FAILURE_LEDGER.md with "after" run links

---

### 3. Downstream Branch Refresh

After merging #2, these branches should be rebased:

| Branch | Action | Priority |
|--------|--------|----------|
| `claude/fix-security-alerts-IZXNl` | Rebase onto main | High |
| `claude/mvp4-ga-completion-muyJA` | Rebase onto main | High |
| Other `claude/*` branches | Rebase as needed | Medium |

**Command:**
```bash
git fetch origin main
git rebase origin/main
git push --force-with-lease
```

---

## Critical Gates Verification

After full merge sequence, verify these gates are green:

| Gate | Workflow | Expected Status |
|------|----------|-----------------|
| CI Core | `ci.yml` | GREEN |
| Supply Chain Integrity | `supply-chain-integrity.yml` | GREEN |
| Docker Build | `docker-build.yml` | GREEN |
| A11y Keyboard Smoke | `a11y-keyboard-smoke.yml` | GREEN |

---

## Notes

1. **No Continue-on-Error Changes:** The `continue-on-error: true` flags in ci.yml were intentionally NOT modified. The MVP4 GA branch (`claude/mvp4-ga-completion-muyJA`) already handles this. Modifying here would create merge conflicts.

2. **Golden-Path-Supply-Chain.yml:** This workflow remains disabled (`if: false`) pending architectural work to move reusable workflows from subdirectories to the top-level workflows directory. This is tracked separately.

3. **Archived Workflows:** Files in `.github/workflows/.archive/` were NOT modified as they are deprecated.

---

## Confirmation Checklist

Before declaring "done":

- [ ] CI_FAILURE_LEDGER.md created with root causes and fixes
- [ ] All YAML files pass syntax validation
- [ ] No critical gates weakened or bypassed
- [ ] Path traversal fix verified as non-duplicate
- [ ] Merge order documented
- [ ] Branch pushed to remote
