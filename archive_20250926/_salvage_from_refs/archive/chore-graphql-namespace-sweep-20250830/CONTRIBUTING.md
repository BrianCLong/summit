# Contributing

- Fork the repo and create feature branches.
- Run server, client, and python tests locally before PRs.
- Follow Conventional Commits for messages.
- For new features, include brief docs and update CHANGELOG if applicable.

## Development
- Node server: `cd server && npm ci && npm test`
- Client: `cd client && npm ci && npm test`
- Python: `cd python && pip install -e .[dev] && pytest`

## Testing

### Unit vs. Integration
- Unit: No network, no real DB. Use `withGraphServer()` to call resolvers via `executeOperation()`; inject context as needed. Keep `maxWorkers=1` for determinism.
- Integration: Real HTTP and infra (Postgres/Neo4j/Redis). Place specs under `server/tests/integration/**` and name them `*.int.test.ts`. Run with `TEST_INTEGRATION=1` or use the CI job.

### Server Testkit
- `server/tests/__helpers__/graphTestkit.ts`: Apollo in-memory server for the production schema. Example:
  - `await withGraphServer(async exec => { const res = await exec({ query, variables }); expect(res.body?.singleResult?.data).toBeDefined(); });`
- `server/tests/__helpers__/legacyGraphTestkit.ts`: In-memory server for the legacy `schema.ts`/`resolvers.ts` GraphQL. Prefer the production testkit when possible.

### Determinism
- Fixed clock and RNG are applied in `server/tests/jest.setup.cjs`.
- Avoid relying on wall clock or random data in tests; prefer seeded helpers.

### Running Tests
- Units (fast): `npm run test:unit`
- Client (Jest): `cd client && npm run test:jest -- --runInBand`
- Integration: `npm run test:integration` (requires services). See `.github/workflows/test.yml` for CI configuration.

### Contributing Guidelines for Tests
- Prefer unit tests that call resolvers via `withGraphServer()` unless you are specifically testing HTTP middleware, auth headers, routers, or Express behavior.
- Heavy I/O (ffmpeg, media) should be mocked; raise timeouts only within those suites.
- Use the `*.int.test.ts` suffix and `server/tests/integration/**` for network/infra specs.

### Unit vs. Integration: When To Choose Which
- Unit (default):
  - You don’t need a real network port or external services (Postgres/Neo4j/Redis).
  - You can inject context (user/tenant/scopes) and stub data sources.
  - Use `withGraphServer()` (production schema) or `withLegacyGraphServer()` (legacy schema) and call `executeOperation()`.
  - Fast and deterministic; runs by default in CI.
- Integration:
  - You need to verify HTTP semantics, middleware, auth headers, routers, or persistence integration.
  - Uses real Express routes and/or external services.
  - Place specs under `server/tests/integration/**` and name `*.int.test.ts`.
  - Run locally with `TEST_INTEGRATION=1` or rely on the CI integration job.

## Development Process

We use a sprint-based development process to manage our work. Each sprint is two weeks long and focuses on a small set of high-priority tasks. We use GitHub project boards to track the progress of our work.

If you are a new contributor, we recommend that you start by looking at the issues in the "To Do" column of our [project boards](docs/project_management/github_project_boards/). These are tasks that have been identified as good first issues for new contributors.

Before you start working on an issue, please leave a comment on the issue to let us know that you are working on it. This will help us avoid duplicating work.

When you have finished working on an issue, please submit a pull request. In your pull request, please include a link to the issue you have been working on.
### GraphQL codegen and schema snapshot

- Codegen uses the live API by default via `VITE_API_URL`. When offline or API is down, use the committed snapshot:
  - Refresh snapshot once when online: `npm run schema:update`
  - Run codegen against snapshot: `npm run codegen:snapshot`
- Pre-push hook behavior:
  - Runs precodegen duplicate check, then codegen with live schema.
  - If live codegen fails, it automatically retries with `client/schema.graphql`.
  - Continues with safelist verification and client lint.
- Tip: to force snapshot for any codegen run, set `CODEGEN_SCHEMA=client/schema.graphql`.

### Pre-push auto-snapshot (optional)
Set `PREPUSH_SCHEMA_AUTOUPDATE=1` to let the pre-push hook auto-create `client/schema.graphql` by calling `npm run schema:update` only if the live schema codegen fails and the snapshot is missing:

```
PREPUSH_SCHEMA_AUTOUPDATE=1 git push
```
