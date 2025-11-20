# Contributing to IntelGraph

## Prereqs

- Node 20 LTS, pnpm 9 (corepack)
- Docker (Compose) for local services

## Setup

- corepack enable && corepack prepare pnpm@9.12.3 --activate
- make bootstrap

## Common Tasks

- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`
- E2E (smoke): `make smoke`
- Build all: `pnpm build`
- Codegen (GraphQL): `pnpm graphql:codegen`
- Bring up services: `make up` / `make down`

## Code Style

We use **ESLint** and **Prettier** to ensure consistent code style.

- **Lint:** `pnpm lint` (checks for errors)
- **Fix:** `pnpm lint:fix` (auto-fixes linting and formatting issues)
- **Format:** `pnpm format` (runs Prettier)

### Guidelines
- **Strictness:** We avoid overly strict rules (like `no-any` everywhere) to keep development frictionless, but we enforce correctness and standard patterns.
- **Prettier:** formatting is automatic. Do not fight Prettier; run `pnpm format` or configure your editor to format on save.
- **CI:** Code must pass `pnpm lint` and `pnpm typecheck` before merging.

## Branch & PR

- Keep changes scoped; run `scripts/pr_guard.sh` before PR
- CI must be green; merge queue enforces required checks

## Troubleshooting

- Run `scripts/green_build.sh` to self-heal and build
- Run `node scripts/audit_workspaces.mjs --strict` for hard audit
