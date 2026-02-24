# Workflow: Small Feature

## When to use

- Adding a small, well-defined feature (<500 LOC net change).

## Inputs required from user

- Feature request or acceptance criteria.
- In-scope / out-of-scope list.
- Target area (see `.claude/areas.md`).
- UX or API expectations (when applicable).

## Discover (read-only)

```bash
# Confirm patterns and ownership
cat .claude/README.md
cat .claude/areas.md

# Find similar features
rg -n "<feature keyword>" <area-path>
rg -n "use[A-Z][a-zA-Z]+" <area-path>

# Review related tests
rg -n "<feature keyword>" <area-path>/__tests__ <area-path>/tests
```

## Plan (checklist)

- [ ] **File list (explicit):**
  - `<path/to/file>`
  - `<path/to/test>`
- [ ] **Risk level:** Low | Medium | High (justify in PR body).
- [ ] **Behavior changes:** bullets of user-visible changes.
- [ ] **Test plan:** unit/integration targets.

## Apply (rules)

- One feature per PR; no unrelated refactors.
- Follow existing patterns and types.
- Small, reviewable diffs; atomic commits.
- Add/adjust tests for new behavior.

## Verify

```bash
# Run targeted tests
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
  - Screenshots if UI

## PR checklist

- [ ] Feature meets acceptance criteria.
- [ ] Tests added/updated.
- [ ] No unrelated changes.
- [ ] Evidence template completed.

## PR body snippet (paste)

```markdown
## Summary
Adds <feature>: <one-line description>.

## Verification
- Commands run: `pnpm test -- --testPathPattern="<test-file>"`, `make claude-preflight`

## Evidence
See `.prbodies/claude-evidence.md`.
```
