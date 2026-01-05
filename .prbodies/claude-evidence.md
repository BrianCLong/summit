# Claude Evidence - PR Body Template

## Summary

<!-- Brief 1-2 sentence description of the change -->

## Scope (Atomic)

<!-- Confirm this PR is atomic and follows the roadmap. No drive-by refactors. -->

- [ ] **Atomic:** This PR addresses exactly one intent
- [ ] **No drive-by refactors:** No unrelated improvements included
- [ ] **Self-contained:** Change works end-to-end

**Intent:** <!-- bugfix | feature | refactor | docs | security | chore -->

## Verification

### Commands Run

```bash
# List exact commands run to validate this change
make claude-preflight  # Fast local checks
make ga                # Full GA gate (required)
pnpm test -- --testPathPattern="<relevant-tests>"
```

### Results

```text
# Paste summary output or "PASS" status
# Include key metrics: tests passed, coverage, lint status
```

## Evidence

### Files Changed

<!-- List key files changed with brief description -->

| File              | Change      |
| ----------------- | ----------- |
| `path/to/file.ts` | Description |

### Test Coverage

- [ ] Existing tests cover this change
- [ ] New tests added: `<test-file-path>`
- [ ] Manual testing performed: <describe>

### Logs / Screenshots

<!-- Attach logs or image paths from artifacts/ -->
<!-- For UI changes, include before/after screenshots -->

## Risk

<!-- Select ONE and provide justification -->

- [ ] **Low** - No breaking changes, standard logic, well-tested
- [ ] **Medium** - Schema changes, new dependencies, moderate blast radius
- [ ] **High** - Migration, security-critical, wide blast radius

**Justification:** <!-- Why this risk level? -->

## Rollback

<!-- Steps to revert if this fails in production -->

```bash
git revert <commit-sha>
# or
make rollback v=<VERSION> env=<ENV>
```

**Additional rollback notes:** <!-- Any cleanup needed after revert? -->

## Follow-ups

<!-- Non-blocking tasks for future PRs. Use "None" if nothing -->

- [ ]

---

## Verification Checklist (Required)

- [ ] `make claude-preflight` passes
- [ ] `make ga` passes
- [ ] No `.only()` or `.skip()` in tests
- [ ] No secrets or credentials committed
- [ ] Follows atomic PR guidelines from `.claude/README.md`
