---
name: goal-to-tests
description: Convert an imperative request into success criteria + tests-first loop.
---

When to use:
- Bug fixes, validation work, refactors, feature additions.
- Any task where "done" needs to be unambiguous.

## How to Convert a Goal to Tests

### 1. Extract Success Criteria

Turn the request into concrete, verifiable statements:

**Request:** "Fix the search results not showing related entities"

**Success criteria:**
- [ ] Search query for "Operation Aurora" returns `Investigation` nodes with linked `Entity` nodes
- [ ] Related entities appear in the GraphQL response under `relatedEntities` field
- [ ] Existing search tests still pass
- [ ] No N+1 query regression (verify with query logging)

### 2. Write Failing Tests First

Before writing implementation code, create tests that encode the criteria:

```bash
# Create or identify the test file
# path: server/resolvers/__tests__/search.test.ts

# Run to confirm they fail (RED)
pnpm test -- --testPathPattern="search.test"
# Expected: 2 failing, 3 passing
```

If you can't write tests first (e.g., infrastructure change), document why:
```
Tests-first not applicable: change is to Docker Compose config.
Verification via: make up && make smoke
```

### 3. Implement Until Green

Loop:
1. Run tests → observe failure
2. Make the smallest change to pass
3. Run tests → observe result
4. Repeat until all criteria pass

### 4. Verify No Regressions

```bash
pnpm test                    # Full test suite
pnpm test -- --testPathPattern="<related-area>"  # Focused suite
make claude-preflight        # Lint + typecheck + unit
```

### 5. Summarize Evidence

```
Goal: Fix search results not showing related entities
Tests: 4 criteria → 4 passing tests
  - search.test.ts:42 — related entities returned (was FAIL, now PASS)
  - search.test.ts:58 — N+1 check via query count assertion (PASS)
  - search.test.ts:71 — existing pagination test (PASS, no regression)
  - search.test.ts:85 — empty query returns empty results (PASS, no regression)
```

Paste this into the Evidence section of the PR body.

## Anti-patterns

- Writing tests after implementation (they might just confirm what you built, not what was asked)
- "Manual testing performed" without any automated verification
- Success criteria that are vague ("it works", "looks good")
- Skipping regression checks
