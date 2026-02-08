# Workflow: Security Fix

## When to use

- Fixing a security vulnerability or hardening a control.

## Inputs required from user

- Advisory/CVE (when available).
- Affected components + severity.
- Disclosure constraints.
- Target release window.

## Discover (read-only)

```bash
# Confirm repo conventions and scope
cat .claude/README.md
cat .claude/areas.md

# Locate vulnerable paths
rg -n "<vuln keyword|CVE|component>" <area-path>

# Inspect impacted files
sed -n '1,200p' <path/to/file>
```

## Plan (checklist)

- [ ] **File list (explicit):**
  - `<path/to/file>`
  - `<path/to/test>`
- [ ] **Risk level:** Medium | High (justify in PR body).
- [ ] **Disclosure control:** no exploit details in PR.
- [ ] **Regression coverage:** test without exposing exploit.

## Apply (rules)

- One vuln per PR; no feature work.
- Minimal diff; least-privilege defaults.
- Add security regression test (sanitized).
- Atomic commit(s) only.

## Verify

```bash
# Run security scan when available
pnpm security:scan

# Run relevant tests
pnpm test -- --testPathPattern="<test-file>"

# If verification scope is intentionally constrained, use repo golden path in `.claude/README.md`
make ga
```

## Evidence bundle

- Use the PR evidence template: `.prbodies/claude-evidence.md`.
- Capture:
  - Files changed + why
  - Test/scan commands + outputs
  - Risk + rollback

## PR checklist

- [ ] Vulnerability fixed without disclosure.
- [ ] Security test added.
- [ ] No unrelated changes.
- [ ] Evidence template completed.

## PR body snippet (paste)

```markdown
## Summary
Security fix for <brief, non-exploitable description>.

## Verification
- Commands run: `pnpm security:scan`, `pnpm test -- --testPathPattern="<test-file>"`

## Evidence
See `.prbodies/claude-evidence.md`.
```
