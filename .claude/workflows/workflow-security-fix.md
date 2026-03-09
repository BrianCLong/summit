# Workflow: Security Fix

Use this workflow when fixing a security vulnerability.

---

## Scope Guardrails

- **One vulnerability per PR** - Don't bundle security fixes
- **Minimal exposure** - Don't describe exploit details in PR
- **Coordinated disclosure** - Follow security team guidance
- **Regression test** - Add test without exposing the vulnerability
- **No feature work** - Security fix only

---

## Steps

### 1. Understand the Vulnerability

```
Gather information (keep details private):
- CVE number (if applicable)
- Affected components
- Attack vector
- Severity (CVSS if available)
```

### 2. Assess the Impact

```
Determine:
- Which users/systems are affected
- Data exposure risk
- Exploitation difficulty
- Urgency of fix
```

### 3. Develop the Fix

```
Implement the security fix:
- Apply principle of least privilege
- Input validation and sanitization
- Output encoding
- Secure defaults
```

### 4. Add Security Tests

```
Add tests that verify the fix without exposing details:
- Test that malicious input is rejected
- Test that access controls work
- Don't include actual exploits in tests
```

### 5. Security Verification

```bash
# Run security scan
pnpm security:scan

# Run tests
pnpm test

# Check for regressions
make ga
```

---

## Local Commands

```bash
# Security scanning
pnpm security:scan
pnpm audit

# Before committing
pnpm test

# Before PR
make claude-preflight
make ga
```

---

## PR Body Template

```markdown
## Summary

Security fix for <brief, non-exploitable description>

**Note:** Details intentionally omitted. See security advisory for full information.

## Changes

- <file1>: <what changed, without vulnerability details>
- ...

## Verification

- [ ] Security test added (without exposing vulnerability)
- [ ] `pnpm security:scan` passes
- [ ] All tests pass
- [ ] `make ga` passes

### Commands Run
```

pnpm security:scan
pnpm test
make ga

```

## Risk

<Severity level> - Refer to security advisory

## Rollback

**Caution:** Rollback reintroduces vulnerability.
Only rollback if fix causes critical breakage.

## Follow-ups

- [ ] Security advisory to be published after merge
- [ ] <other follow-ups>
```

---

## Checklist Before PR

- [ ] Fix addresses the vulnerability
- [ ] No vulnerability details in PR description
- [ ] Security tests added
- [ ] No unrelated changes
- [ ] `make ga` passes
- [ ] Security team notified/consulted
