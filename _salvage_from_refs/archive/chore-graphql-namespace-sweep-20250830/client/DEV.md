# Client Dev Notes

- Services-enabled tests (Neo4j/Python/ffmpeg) run only when `WITH_SERVICES=1`.
- AI-Enhanced streaming/chunking tests are skipped by default; enable with `WITH_ASSISTANT=1`.

Common commands

```bash
# Unit/mocked tests only (PR gate)
pnpm exec jest --config jest.config.cjs --ci --runInBand --coverage

# Re-enable AI-Enhanced tests (requires capable runner)
WITH_ASSISTANT=1 pnpm exec jest --config jest.config.cjs --ci --runInBand

# Playwright smoke (needs port-capable runner)
pnpm playwright test --project=chromium --grep @smoke
```

See the server services guide for running Neo4j/Redis/ML locally:

- `../server/DEV-SERVICES.md`

