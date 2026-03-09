---
name: diff-budget
description: Declare and enforce a diff budget; prevent drive-by edits.
---

When to use:
- Any edit to existing code.
- Required by the ANTIGRAVITY workflow (Step B) and S-AOS (CLAUDE.md §3).

## How to Declare a Diff Budget

### 1. Before Coding — Predict the Diff

Fill in this table during planning:

| Metric | Expected | Actual |
|--------|----------|--------|
| Files touched | | |
| LOC added | | |
| LOC removed | | |
| New public APIs | 0 | |
| New dependencies | 0 | |

### 2. Declare Prohibited Changes

State what you will NOT touch, even if you see opportunities:

- No formatting/whitespace changes outside touched functions
- No renaming variables in unrelated files
- No refactoring patterns you notice but weren't asked to fix
- No adding type annotations to code you didn't change

### 3. After Coding — Reconcile

Run `git diff --stat` and compare actual vs expected. If exceeded:

```
**Budget exceeded?** Yes — added 45 LOC beyond estimate.
Reason: discovered that the validation logic required a shared utility
that didn't exist yet. The utility is used by 2 functions in this PR,
not speculative.
```

If on budget:

```
**Budget exceeded?** No
```

### 4. Output Format

Paste the completed budget into the PR description under `## Diff Budget`. The template lives at `.prbodies/claude-evidence.md`.

## Enforcement Rules

- Every changed line must trace to the PR goal
- If a file appears in the diff that isn't in the budget, justify it or remove it
- If LOC delta exceeds estimate by >50%, reduce scope before proceeding
- New public APIs or dependencies require explicit justification
