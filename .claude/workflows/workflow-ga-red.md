# Workflow: GA Gate Red

## When to use

- `make ga` is failing and must be restored.

## Inputs required from user

- GA output log (first failure).
- Branch/commit that introduced failure (when tracked).
- Scope area (see `.claude/areas.md`).

## Discover (read-only)

```bash
# Capture failing output
make ga 2>&1 | tee ga-output.txt

# Identify first failure
rg -n "(FAIL|ERROR|failed)" ga-output.txt

# Inspect impacted files
sed -n '1,200p' <path/to/file>
```

## Plan (checklist)

- [ ] **File list (explicit):**
  - `<path/to/file>`
  - `<path/to/test>`
- [ ] **Risk level:** Low (gate fix only).
- [ ] **Failure type:** lint | typecheck | test | security | build.
- [ ] **Rollback:** revert commit if needed.

## Apply (rules)

- Fix only the failure; no feature work.
- Minimal diff; avoid refactors.
- Atomic commit(s) only.

## Verify

```bash
# Re-run the failing check first
pnpm lint        # if lint failed
pnpm typecheck   # if typecheck failed
pnpm test -- --testPathPattern="<failing-test>"  # if tests failed

# Then full GA
make ga
```

## Evidence bundle

- Use the PR evidence template: `.prbodies/claude-evidence.md`.
- Capture:
  - Failure output (before/after)
  - Files changed + why
  - Commands run

## PR checklist

- [ ] GA failure reproduced.
- [ ] Fix is minimal and scoped.
- [ ] `make ga` passes.
- [ ] Evidence template completed.

## PR body snippet (paste)

```markdown
## Summary
Fixes failing GA gate (<failure type>).

## Verification
- Commands run: `make ga`

## Evidence
See `.prbodies/claude-evidence.md`.
```
