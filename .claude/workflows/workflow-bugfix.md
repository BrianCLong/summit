# Workflow: Bugfix

## 1) When to use

- A defect/regression exists and expected behavior is known.
- Scope is one bug path, one root cause, one PR.

## 2) Inputs required from user

- Issue link or incident ID.
- Reproduction steps (expected vs actual).
- Impacted area/path (use `.claude/areas.md` if present).
- Severity + release target.

## 3) Discover (read-only)

```bash
# Repo contract (if present)
cat .claude/README.md
cat .claude/areas.md
cat .prbodies/claude-evidence.md

# Find bug path + existing tests
rg -n "<error|symptom|component>" .
rg -n "<error|symptom|component>" client server packages services tests

# Inspect candidate files
sed -n '1,220p' <path/to/file>
sed -n '1,220p' <path/to/test>
```

## 4) Plan (checklist)

- [ ] File list (explicit):
  - [ ] `<path/to/file>`
  - [ ] `<path/to/test>`
- [ ] Root cause statement is one sentence.
- [ ] Risk level selected: Low | Medium | High.
- [ ] Regression test approach defined.

## 5) Apply (rules)

- Keep diff minimal and local to bug path.
- No drive-by refactors.
- Add/extend regression test in same PR.
- Keep commits atomic and reviewable.

## 6) Verify

```bash
# Narrow first
pnpm test -- --testPathPattern="<test-file>"

# Area checks
pnpm lint
pnpm typecheck

# Preferred repo gates
make claude-preflight
make ga
```

- If a command is unavailable or out of scope, use the repo golden path in `.claude/README.md`.

## 7) Evidence bundle

Use `.prbodies/claude-evidence.md` (do not duplicate template).
Capture at minimum:

- Before/after behavior summary.
- Exact commands and pass/fail results.
- Files changed and purpose.
- Risk classification + rollback command.

## 8) PR checklist

- [ ] Single bug intent.
- [ ] Regression test included.
- [ ] Verify commands recorded.
- [ ] Evidence template completed.

### PR body snippet (paste)

```markdown
## Summary
Fixes <issue-id>: <single-line bug description>.

## Verification
- `pnpm test -- --testPathPattern="<test-file>"`
- `make claude-preflight`
- `make ga`

## Evidence
Filled using `.prbodies/claude-evidence.md`.
```
