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

## Development Process

We use a sprint-based development process to manage our work. Each sprint is two weeks long and focuses on a small set of high-priority tasks. We use GitHub project boards to track the progress of our work.

If you are a new contributor, we recommend that you start by looking at the issues in the "To Do" column of our [project boards](docs/project_management/github_project_boards/). These are tasks that have been identified as good first issues for new contributors.

Before you start working on an issue, please leave a comment on the issue to let us know that you are working on it. This will help us avoid duplicating work.

When you have finished working on an issue, please submit a pull request. In your pull request, please include a link to the issue you have been working on.
