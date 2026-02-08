---
name: assumption-ledger
description: Produce an explicit assumption ledger and stop conditions before coding.
---

When to use:
- Any task with unclear requirements, multiple valid interpretations, or unfamiliar code.
- Required by the ANTIGRAVITY workflow (Step B) and S-AOS (CLAUDE.md §1).

## How to Produce an Assumption Ledger

### 1. List Assumptions

For each assumption, state what you're assuming and why it's reasonable:

| Assumption | Justification | Verified? |
|------------|---------------|-----------|
| Example: Auth middleware uses Express conventions | Existing `server/middleware/` files follow this pattern | Yes — confirmed by reading `auth.ts` |
| Example: Neo4j schema already has `Investigation` node | Referenced in `graphql/typeDefs.ts` | Pending — need to verify with `make db:neo4j:migrate` |

### 2. List Ambiguities

For each ambiguity, give 2–3 interpretations and state which you chose:

**Ambiguities encountered:**
- "Improve the search" could mean (a) full-text search, (b) graph traversal, or (c) UI autocomplete. Chose (a) based on the issue title mentioning "relevance ranking."

### 3. Define Stop Conditions

State what would force you to stop and ask rather than proceed:

**Stop conditions:**
- If the change requires a database migration that touches production data
- If any assumption above is marked "Pending" and affects correctness
- If the diff budget would exceed 200 LOC without clear justification

### 4. Output Format

Paste the completed ledger into the PR description under `## Assumption Ledger`. The template lives at `.prbodies/claude-evidence.md`.

## Anti-patterns

- Assumptions that are actually guesses (no justification)
- Missing stop conditions (means you'd never ask for help)
- "None" when there are clearly ambiguities
