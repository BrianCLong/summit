# Workflow: Security Fix

## 1) When to use

- Security vulnerability remediation.
- Security hardening to close a known risk path.

## 2) Inputs required from user

- Advisory/CVE (when available).
- Severity and affected surfaces.
- Disclosure handling constraints.
- Target remediation timeline.

## 3) Discover (read-only)

```bash
# Repo contract (if present)
cat .claude/README.md
cat .claude/areas.md
cat .prbodies/claude-evidence.md

# Locate affected code/tests
rg -n "<cve|vuln keyword|surface>" client server packages services tests

# Inspect candidate files
sed -n '1,220p' <path/to/file>
sed -n '1,220p' <path/to/test>
```

## 4) Plan (checklist)

- [ ] File list (explicit):
  - [ ] `<path/to/file>`
  - [ ] `<path/to/test>`
- [ ] Risk level selected: Medium | High.
- [ ] Disclosure-safe PR language confirmed.
- [ ] Security regression test approach defined.

## 5) Apply (rules)

- One vulnerability intent per PR.
- Minimum-change remediation; no feature work.
- Apply least-privilege and secure defaults.
- Add sanitized security regression tests.
- Keep commits atomic.

## 6) Verify

```bash
# Security checks
pnpm security:scan
pnpm audit

# Targeted and broader tests
pnpm test -- --testPathPattern="<test-file>"
pnpm test

# Preferred repo gates
make claude-preflight
make ga
```

- If commands are unavailable, use repo golden path in `.claude/README.md`.

## 7) Evidence bundle

Use `.prbodies/claude-evidence.md` (do not duplicate template).
Capture at minimum:

- Non-sensitive remediation summary.
- Security/test commands and outputs.
- Files changed and rationale.
- Risk + rollback.

## 8) PR checklist

- [ ] Vulnerability path addressed.
- [ ] No exploit details in PR text.
- [ ] Security regression tests included.
- [ ] Verify commands recorded.
- [ ] Evidence template completed.

### PR body snippet (paste)

```markdown
## Summary
Security fix for <brief non-sensitive description>.

## Verification
- `pnpm security:scan`
- `pnpm test -- --testPathPattern="<test-file>"`
- `make ga`

## Evidence
Filled using `.prbodies/claude-evidence.md`.
```
