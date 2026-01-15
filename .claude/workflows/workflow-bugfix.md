# Workflow: Bug Fix

Use this workflow when fixing a reported bug or regression.

---

## Scope Guardrails

- **One bug per PR** - Don't bundle multiple fixes
- **No refactoring** - Fix the bug, don't improve surrounding code
- **Minimal diff** - Smallest change that fixes the issue
- **Add regression test** - Prevent the bug from returning

---

## Steps

### 1. Understand the Bug

```
Read the bug report/issue. Identify:
- Expected behavior
- Actual behavior
- Steps to reproduce
- Affected files/components
```

### 2. Locate the Bug

```
Search for the relevant code:
- Use grep/glob to find affected files
- Read the code to understand the flow
- Identify root cause vs. symptoms
```

### 3. Write a Failing Test

```
Before fixing, write a test that reproduces the bug:
- Test should FAIL before the fix
- Test should PASS after the fix
- This becomes your regression test
```

### 4. Implement the Fix

```
Apply the minimal fix:
- Change only what's necessary
- Don't refactor unrelated code
- Preserve existing behavior for other cases
```

### 5. Verify the Fix

```bash
# Run the specific test
pnpm test -- --testPathPattern="<test-file>"

# Run related test suite
pnpm test -- --testPathPattern="<directory>"

# Run full test suite
pnpm test
```

---

## Local Commands

```bash
# Before committing
pnpm lint:fix
pnpm test

# Before PR
make claude-preflight
make ga
```

---

## PR Body Template

```markdown
## Summary

Fixes #<issue-number>: <brief description of the bug>

## Root Cause

<Explain what was causing the bug>

## Fix

<Explain the fix and why it works>

## Verification

- [ ] Added regression test: `<test-file-path>`
- [ ] Existing tests pass
- [ ] `make ga` passes

### Commands Run
```

pnpm test -- --testPathPattern="<test-file>"
make ga

```

### Test Output

<paste relevant test output>

## Risk

Low | Medium | High

<Justify risk level>

## Rollback

Revert this commit: `git revert <sha>`

## Follow-ups

- [ ] <any follow-up tasks, or "None">
```

---

## Checklist Before PR

- [ ] Bug is reproducible with a test
- [ ] Fix is minimal and focused
- [ ] No unrelated changes
- [ ] Regression test added
- [ ] `make ga` passes
