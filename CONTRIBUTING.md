# Contributing to IntelGraph

## Prereqs

- Node 20 LTS, pnpm 9 (corepack)
- Docker (Compose) for local services

## Setup

- corepack enable && corepack prepare pnpm@9.12.3 --activate
- make bootstrap

## Common Tasks

- Typecheck: `make typecheck`
- Lint: `make lint`
- Test: `make test`
- E2E (smoke): `make e2e`
- Build all: `make build`
- Codegen (GraphQL): `make codegen`
- Bring up services: `make up` / `make down`

## Branch & PR

- Keep changes scoped; run `scripts/pr_guard.sh` before PR
- CI must be green; merge queue enforces required checks

## Troubleshooting

- Run `scripts/green_build.sh` to self-heal and build
- Run `node scripts/audit_workspaces.mjs --strict` for hard audit

## Code Documentation Standards

Good comments explain **why** and **how**, not just **what**.

### When to Comment
1.  **Complex Logic:** Explain "magic numbers" or tricky algorithms (e.g., simulation weighting).
2.  **Invariants:** State what must be true for the code to work (e.g., "Input array must be sorted").
3.  **Workarounds:** Document *why* a hack is there (e.g., "Disable integer lossless to support DTOs").
4.  **Public APIs:** exported classes and functions should have TSDoc/JSDoc explaining their purpose.

### Anti-Patterns
- **Redundant:** `i++; // increment i`
- **Outdated:** Comments that refer to deleted variables or old behavior.
- **Commented-out Code:** Just delete it; Git remembers.

### Format
Use TSDoc/JSDoc `/** ... */` for functions/classes and `//` for inline implementation details.

```typescript
/**
 * Calculates the momentum of a narrative arc.
 * Uses a weighted average of top 3 entities to prevent outlier skew.
 */
function calculateMomentum(...) { ... }
```
