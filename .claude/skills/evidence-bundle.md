---
name: evidence-bundle
description: Generate Summit-style evidence for merge readiness.
---

When to use:
- Any PR intended for merge.
- Required by the ANTIGRAVITY workflow (Step E) and S-AOS (CLAUDE.md §5).

## How to Produce an Evidence Bundle

### 1. What Changed (1 paragraph)

Write a concise paragraph summarizing the change, its motivation, and its impact. This is NOT a commit message — it explains the "why" and "so what."

### 2. Files Changed (bulleted list)

| File | Change |
|------|--------|
| `path/to/file.ts` | **New** — Brief description of what it does |
| `path/to/other.ts` | **Modified** — What specifically changed and why |
| `path/to/deleted.ts` | **Removed** — Why it was removed |

### 3. Verification Commands + Results

List the exact commands you ran and their outcomes:

```bash
make claude-preflight   # Fast local checks
make ga                 # Full GA gate
pnpm test -- --testPathPattern="<relevant>"
```

```text
Results:
- Lint: PASS (0 warnings)
- Typecheck: PASS
- Tests: 47/47 passed
- Coverage: 82% (+2.1%)
```

If commands cannot run in the environment, state:
```
Cannot run in this environment. User should run:
make ga
```

### 4. Evidence by Change Type

Select the applicable category and provide the required evidence:

| Change Type | Required Evidence |
|-------------|-------------------|
| **API** | Request/response examples, schema diff, backward compatibility check |
| **UI** | Before/after screenshots, accessibility check |
| **Infrastructure** | `terraform plan` output, rollback verification |
| **Security** | Threat model notes, abuse case tests, policy check |
| **Database** | Migration up/down verified, data integrity check |
| **Docs-only** | Link validation, rendered preview |

### 5. Risk Assessment (3–6 bullets)

- What could go wrong?
- What's the blast radius?
- Are there dependencies on external systems?
- Is this reversible?
- Any timing/ordering concerns?

### 6. Rollback Plan

```bash
git revert <commit-sha>
# Additional cleanup if needed:
# make db:rollback (if migration)
# kubectl rollout undo (if deployed)
```

### 7. Output Format

Paste the completed bundle into the PR description. The template lives at `.prbodies/claude-evidence.md`.
