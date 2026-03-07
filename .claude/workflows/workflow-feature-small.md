# Workflow: Feature (Small)

## 1) When to use

- Small, bounded feature with clear acceptance criteria.
- Intended to stay compact (single intent, usually <500 LOC net).

## 2) Inputs required from user

- Acceptance criteria (must be testable).
- In-scope / out-of-scope bullets.
- Impacted area/path (use `.claude/areas.md` if present).
- UX/API examples (when applicable).

## 3) Discover (read-only)

```bash
# Repo contract (if present)
cat .claude/README.md
cat .claude/areas.md
cat .prbodies/claude-evidence.md

# Find similar implementations and tests
rg -n "<feature keyword>" client server packages services
rg -n "<feature keyword>" tests client/**/__tests__ server/tests

# Inspect baseline files
sed -n '1,220p' <path/to/file>
sed -n '1,220p' <path/to/test>
```

## 4) Plan (checklist)

- [ ] File list (explicit):
  - [ ] `<path/to/file>`
  - [ ] `<path/to/test>`
- [ ] User-visible behavior changes listed.
- [ ] Risk level selected: Low | Medium | High.
- [ ] Verification plan maps to acceptance criteria.

## 5) Apply (rules)

- One feature intent per PR.
- Follow existing project patterns and typing.
- Keep diff small and atomic.
- Add/update tests in the same PR.

## 6) Verify

```bash
# Targeted tests first
pnpm test -- --testPathPattern="<test-file>"

# Quality checks
pnpm lint
pnpm typecheck

# Preferred repo gates
make claude-preflight
make ga
```

- If commands are unavailable, use repo golden path in `.claude/README.md`.

## 7) Evidence bundle

Use `.prbodies/claude-evidence.md` (do not duplicate template).
Capture at minimum:

- Acceptance criteria mapping (criterion -> evidence).
- Commands run with pass/fail outputs.
- Files changed and rationale.
- Risk + rollback.
- UI screenshot paths (if UI changed).

## 8) PR checklist

- [ ] Single feature intent.
- [ ] Tests added/updated.
- [ ] Verify commands recorded.
- [ ] Evidence template completed.

### PR body snippet (paste)

```markdown
## Summary
Adds <feature-name>: <single-line behavior change>.

## Verification
- `pnpm test -- --testPathPattern="<test-file>"`
- `make claude-preflight`
- `make ga`

## Evidence
Filled using `.prbodies/claude-evidence.md`.
```
