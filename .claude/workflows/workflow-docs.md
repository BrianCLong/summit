# Workflow: Documentation

## 1) When to use

- Docs-only updates (guides, runbooks, reference content).
- No behavior change in runtime code.

## 2) Inputs required from user

- Target doc path/topic.
- Required corrections/additions.
- Source of truth (code path, runbook, policy, or issue).

## 3) Discover (read-only)

```bash
# Repo contract (if present)
cat .claude/README.md
cat .claude/areas.md
cat .prbodies/claude-evidence.md

# Locate related docs and references
rg -n "<topic keyword>" docs RUNBOOKS .claude

# Inspect target docs
sed -n '1,220p' <path/to/doc.md>
```

## 4) Plan (checklist)

- [ ] File list (explicit):
  - [ ] `<path/to/doc.md>`
- [ ] Claims requiring validation are listed.
- [ ] Risk level selected: Low (docs-only).
- [ ] Link/reference check plan defined.

## 5) Apply (rules)

- Keep language operational and concise.
- Prefer bullets + copy/paste command blocks.
- No speculation; align to source-of-truth files.
- Keep commits atomic.

## 6) Verify

```bash
# Validate commands/examples included in docs
<commands copied from doc>

# Optional markdown lint if configured
pnpm lint -- --ext .md

# Preferred repo preflight
make claude-preflight
```

- If commands are unavailable, use repo golden path in `.claude/README.md`.

## 7) Evidence bundle

Use `.prbodies/claude-evidence.md` (do not duplicate template).
Capture at minimum:

- What claims were verified and how.
- Links/examples validated.
- Files changed and rationale.
- Risk + rollback.

## 8) PR checklist

- [ ] Docs scope only.
- [ ] Claims/commands validated or intentionally constrained.
- [ ] Verify commands recorded.
- [ ] Evidence template completed.

### PR body snippet (paste)

```markdown
## Summary
Updates docs for <topic>.

## Verification
- `<commands from docs or intentionally constrained note>`
- `make claude-preflight`

## Evidence
Filled using `.prbodies/claude-evidence.md`.
```
