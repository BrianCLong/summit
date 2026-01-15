# Workflow: GA Gate Red (Fix Failing Gate)

Use this workflow when `make ga` is failing and you need to fix it.

---

## Scope Guardrails

- **Minimal fix** - Only fix what's broken
- **No new features** - Gate fix only
- **No refactoring** - Fix the failure, nothing else
- **Evidence required** - Document what was broken and how you fixed it

---

## Steps

### 1. Identify the Failure

```bash
# Run GA gate and capture output
make ga 2>&1 | tee ga-output.txt

# Look for the first failure
grep -E "(FAIL|ERROR|failed)" ga-output.txt
```

### 2. Categorize the Failure

| Failure Type     | Typical Cause       | Fix Path                        |
| ---------------- | ------------------- | ------------------------------- |
| Lint             | Code style issues   | `pnpm lint:fix`                 |
| Type errors      | TypeScript issues   | Fix types, run `pnpm typecheck` |
| Unit test        | Broken test or code | Fix code or update test         |
| Integration test | Service dependency  | Check `make up`, fix test       |
| Security scan    | Vulnerability       | Update dependency or fix code   |
| Build            | Compilation error   | Fix syntax or imports           |

### 3. Apply Minimal Fix

```
Fix ONLY what's broken:
- If lint: auto-fix with pnpm lint:fix
- If test: minimal code or test fix
- If type error: add missing types
- If security: update package or patch
```

### 4. Verify the Fix

```bash
# Run the specific failing check first
pnpm lint      # if lint failed
pnpm typecheck # if types failed
pnpm test      # if tests failed

# Then run full GA gate
make ga
```

### 5. If Still Failing

```bash
# Check for cascading failures
make ga 2>&1 | tee ga-output-2.txt

# Compare with first run
diff ga-output.txt ga-output-2.txt

# Repeat fix cycle for new failures
```

---

## Common Fixes

### Lint Failures

```bash
# Auto-fix most issues
pnpm lint:fix

# For remaining issues, check the error message
pnpm lint -- --fix
```

### Type Errors

```bash
# See detailed errors
pnpm typecheck

# Common fixes:
# - Add missing type annotations
# - Fix import paths
# - Update interface definitions
```

### Test Failures

```bash
# Run specific failing test with verbose output
pnpm test -- --testPathPattern="<failing-test>" --verbose

# Common fixes:
# - Update snapshots: pnpm test -- -u
# - Fix assertion expectations
# - Mock missing dependencies
```

### Security Scan Failures

```bash
# Check what's vulnerable
pnpm audit

# Update vulnerable packages
pnpm update <package-name>

# If can't update, check for patches
```

---

## Local Commands

```bash
# Quick diagnostics
pnpm lint
pnpm typecheck
pnpm test -- --verbose

# Full gate (must pass before PR)
make ga
```

---

## PR Body Template

```markdown
## Summary

Fixes failing GA gate

## Failure Analysis

**What was failing:**
```

<paste the failure output>
```

**Root cause:** <brief explanation>

## Fix

- <file1>: <what changed>
- ...

## Verification

- [ ] Specific failure fixed
- [ ] Full `make ga` passes

### Commands Run

```
make ga
```

### GA Output

```
<paste successful GA output>
```

## Risk

Low - Gate fix only, no feature changes

## Rollback

Revert this commit: `git revert <sha>`

## Follow-ups

- [ ] Investigate root cause if not obvious
- [ ] <any other follow-ups, or "None">

```

---

## Checklist Before PR

- [ ] GA gate was actually failing
- [ ] Fix is minimal (no feature work)
- [ ] `make ga` now passes
- [ ] No unrelated changes
- [ ] Failure documented in PR
```
