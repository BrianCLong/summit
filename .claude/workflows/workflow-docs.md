# Workflow: Documentation

## When to use

- Updating docs, runbooks, or guides (no code changes).

## Inputs required from user

- Doc target (file path or topic).
- Desired changes (bullets).
- Source of truth (code, runbook, or policy link).

## Discover (read-only)

```bash
# Confirm doc conventions
cat .claude/README.md
cat .claude/areas.md

# Locate related docs
rg -n "<topic keyword>" docs RUNBOOKS .claude

# Inspect target doc
sed -n '1,200p' <path/to/doc.md>
```

## Plan (checklist)

- [ ] **File list (explicit):**
  - `<path/to/doc.md>`
- [ ] **Risk level:** Low (docs-only).
- [ ] **Claims validated:** list commands or sources used.
- [ ] **Links verified:** list key links.

## Apply (rules)

- One topic per PR; no drive-by changes.
- Keep language terse and accurate.
- Avoid speculation; cite sources.
- Atomic commit(s) only.

## Verify

```bash
# If examples contain commands, run them.
<commands from the doc>

# If verification scope is intentionally constrained, use repo golden path in `.claude/README.md`
make claude-preflight
```

## Evidence bundle

- Use the PR evidence template: `.prbodies/claude-evidence.md`.
- Capture:
  - Files changed + why
  - Commands run (when executed)
  - Link checks

## PR checklist

- [ ] Examples verified or removed.
- [ ] Links checked.
- [ ] No code changes.
- [ ] Evidence template completed.

## PR body snippet (paste)

```markdown
## Summary
Updates documentation for <topic>.

## Verification
- Commands run: `<commands or intentionally constrained>`, `make claude-preflight`

## Evidence
See `.prbodies/claude-evidence.md`.
```
