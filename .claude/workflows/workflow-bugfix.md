# Workflow: Bug Fix

## When to use

- Fixing a reported bug or regression.

## Inputs required from user

- Issue/incident link.
- Repro steps (expected vs actual).
- Affected area (see `.claude/areas.md`).
- Severity and target release.

## Discover (read-only)

```bash
# Locate likely ownership and patterns
cat .claude/README.md
cat .claude/areas.md

# Find relevant code and tests
rg -n "<keyword|error|component>" <area-path>
rg -n "<bug keyword>" <area-path>/__tests__ <area-path>/tests

# Inspect files
sed -n '1,200p' <path/to/file>
```

## Plan (checklist)

- [ ] **File list (explicit):**
  - `<path/to/file>`
  - `<path/to/test>`
- [ ] **Risk level:** Low | Medium | High (justify in PR body).
- [ ] **Regression coverage:** add/extend test for the failure.
- [ ] **Edge cases:** list inputs that previously failed.

## Apply (rules)

- Smallest diff that fixes root cause.
- One bug per PR; no refactors.
- Add regression test before/with fix.
- Atomic commit(s) only.

## Verify

```bash
# Run the narrowest failing test first
pnpm test -- --testPathPattern="<test-file>"

# If verification scope is intentionally constrained, use repo golden path in `.claude/README.md`
make claude-preflight
```

## Evidence bundle

- Use the PR evidence template: `.prbodies/claude-evidence.md`.
- Capture:
  - Files changed + why
  - Test commands + outputs
  - Risk + rollback

## PR checklist

- [ ] Bug is reproducible and fixed.
- [ ] Regression test added.
- [ ] No unrelated changes.
- [ ] Evidence template completed.

## PR body snippet (paste)

```markdown
## Summary
Fixes <issue>: <one-line bug description>.

## Verification
- Commands run: `pnpm test -- --testPathPattern="<test-file>"`, `make claude-preflight`

## Evidence
See `.prbodies/claude-evidence.md`.
```
