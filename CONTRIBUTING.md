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
