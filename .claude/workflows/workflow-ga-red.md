# Workflow: GA Gate Red

## 1) When to use

- `make ga` is failing and must be restored quickly.
- Scope is a gate-recovery fix only.

## 2) Inputs required from user

- Current GA failure log.
- Suspected introducing commit/PR (when tracked).
- Impacted area/path.

## 3) Discover (read-only)

```bash
# Capture and inspect failure output
make ga 2>&1 | tee ga-output.txt
rg -n "(FAIL|ERROR|failed)" ga-output.txt

# Inspect likely files
sed -n '1,220p' <path/to/file>
sed -n '1,220p' <path/to/test>

# Repo contract (if present)
cat .claude/README.md
cat .claude/areas.md
cat .prbodies/claude-evidence.md
```

## 4) Plan (checklist)

- [ ] File list (explicit):
  - [ ] `<path/to/file>`
  - [ ] `<path/to/test>`
- [ ] Failure class selected: lint | typecheck | test | security | build.
- [ ] Risk level selected: Low (gate fix only).
- [ ] Rollback path defined.

## 5) Apply (rules)

- Fix only failing gate path.
- No feature additions or refactors.
- Keep diff and commits minimal/atomic.

## 6) Verify

```bash
# Re-run failing class first
pnpm lint
pnpm typecheck
pnpm test -- --testPathPattern="<failing-test>"

# Re-run full gate
make ga
```

- If commands are unavailable, use repo golden path in `.claude/README.md`.

## 7) Evidence bundle

Use `.prbodies/claude-evidence.md` (do not duplicate template).
Capture at minimum:

- First failing signal + final passing signal.
- Commands run and outputs.
- Files changed and rationale.
- Risk + rollback.

## 8) PR checklist

- [ ] GA failure reproduced.
- [ ] Minimal scoped fix applied.
- [ ] `make ga` passing.
- [ ] Evidence template completed.

### PR body snippet (paste)

```markdown
## Summary
Restores GA gate by fixing <failure-class>.

## Verification
- `<failing class command>`
- `make ga`

## Evidence
Filled using `.prbodies/claude-evidence.md`.
```
