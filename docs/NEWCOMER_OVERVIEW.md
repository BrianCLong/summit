# Summit newcomer overview

This guide orients new contributors to the Summit monorepo, highlights the most important directories, and outlines reliable next steps for getting productive.

## Repository structure highlights
- **server/**: Node.js/Express/Apollo GraphQL backend. Contains resolvers, services, middleware, database connectors, workers, and configuration.
- **client/**: React/Vite single-page app with components, pages, GraphQL queries, and hooks. Uses Apollo Client with persisted operations.
- **services/**: Collection of microservices (API gateways, authz, analytics, agents, audit, etc.) that extend or specialize platform capabilities.
- **packages/**: Shared libraries (graph/AI, provenance ledger, policy/audit, CLI, and other cross-cutting utilities) reused by apps and services.
- **docs/**: Onboarding, architecture, runbooks, and deployment references. Auto-generated materials live under `docs/generated/`.
- **k8s/** and **docker-compose.*.yml**: Deployment manifests and local environment profiles.
- **tools/** and **scripts/**: Developer tooling, CI/CD helpers, and operational automation.

## Development workflow essentials
1. **Install dependencies**: `npm install && (cd server && npm install) && (cd client && npm install)`.
2. **Run the stack**: `npm run dev` starts the backend and frontend together for local exploration.
3. **Check quality**: `npm run lint && npm run format` for style; `npm test` for combined server/client tests; backend-only coverage with `cd server && npm run test:coverage`.
4. **Database tasks**: `npm run db:migrate` and `npm run db:seed` from the repo root or `server/`.
5. **Containers**: `npm run docker:dev` for local profiles or `npm run docker:prod` for production-like setups.

## Key conventions and guardrails
- **Language/tooling**: TypeScript/JavaScript (2-space indentation) with Prettier + ESLint. Use Node 18+ and pnpm/Turbo where configured.
- **Security/compliance**: Respect ABAC/purpose-based access controls in resolvers; maintain Redis caching with redaction; preserve audit logging. Never commit secrets—use `.env` (copied from `.env.example`).
- **APIs**: GraphQL at `/graphql` (primary) with persisted queries, plus REST routes for AI/search/health and WebSocket subscriptions for real-time updates.
- **Deployment readiness**: Keep `make up` and smoke tests green; avoid large/binary diffs in PRs; follow Conventional Commits for history and branch naming.

## Suggested learning path
1. **Backend orientation**: Inspect `server/src/graphql/resolvers.ts` and related domain modules to see context creation, policy enforcement, caching, and DB access patterns.
2. **Frontend queries**: Review persisted operations and hooks in `client/src/graphql` and `client/src/queries` to understand available APIs and required variables.
3. **Shared packages**: Skim `packages/graph-ai-core`, `packages/prov-ledger`, and `packages/policy-audit` to learn the shared building blocks used across services.
4. **Operations**: Read `docs/ONBOARDING.md` and `docs/ARCHITECTURE.md` for environment setup, workflows, and deployment expectations. Explore `k8s/` manifests and `docker-compose.*.yml` for local vs. production profiles.
5. **Quality gates**: Before opening a PR, run linting, formatting, and the relevant test suites; include screenshots for UI changes and ensure CI pipelines stay green.
