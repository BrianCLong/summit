# Workflow: Small Feature

Use this workflow when adding a small, well-defined feature.

---

## Scope Guardrails

- **One feature per PR** - Single logical addition
- **< 500 lines changed** - If larger, split into multiple PRs
- **Self-contained** - Feature works end-to-end in this PR
- **Tested** - Unit tests for new functionality
- **No refactoring** - Don't improve unrelated code

---

## Steps

### 1. Understand Requirements

```
Clarify the feature scope:
- What is the user-facing behavior?
- What are the acceptance criteria?
- What's explicitly OUT of scope?
```

### 2. Research Existing Patterns

```
Find similar features in the codebase:
- How are similar things implemented?
- What patterns should be followed?
- What utilities/helpers exist?
```

### 3. Plan the Implementation

```
Identify files to modify:
- List all files that need changes
- Estimate the diff size
- If > 500 lines, consider splitting
```

### 4. Implement the Feature

```
Code the feature:
- Follow existing patterns
- Use TypeScript types
- Handle errors gracefully
- Add inline comments for complex logic
```

### 5. Add Tests

```
Write tests for the feature:
- Unit tests for new functions
- Integration tests if crossing boundaries
- Edge cases and error scenarios
```

### 6. Verify the Implementation

```bash
# Run new tests
pnpm test -- --testPathPattern="<test-file>"

# Run full test suite
pnpm test

# Check types
pnpm typecheck
```

---

## Local Commands

```bash
# During development
pnpm lint:fix
pnpm typecheck

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

Adds <feature name>: <brief description>

## Changes

- <file1>: <what changed>
- <file2>: <what changed>
- ...

## How It Works

<Brief explanation of the implementation>

## Verification

- [ ] Unit tests added: `<test-file-path>`
- [ ] All tests pass
- [ ] `make ga` passes

### Commands Run
```

pnpm test -- --testPathPattern="<test-file>"
pnpm typecheck
make ga

```

### Screenshots/Output

<If UI change, add screenshots. If API, add example request/response>

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

- [ ] Feature is complete and works end-to-end
- [ ] < 500 lines changed
- [ ] Tests added for new functionality
- [ ] No unrelated changes
- [ ] `make ga` passes
