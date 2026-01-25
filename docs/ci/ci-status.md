# CI/CD and Test Status

## Current CI Workflows
The repository contains a large number of GitHub Actions workflows in `.github/workflows/`. Key workflows include:
- `ci.yml`: Likely the main CI loop.
- `ci-main.yml`: Likely for main branch.
- `server-ci.yml`: Server specific CI.
- `client-ci.yml`: Client specific CI.
- `test-coverage.yml`: Coverage reporting.

## Test Configuration Issues
- **Jest/ESM Mismatch**: `server/package.json` specifies `"type": "module"`, but `server/jest.config.ts` uses `useESM: false` in `ts-jest` transform. This causes issues with ESM-only dependencies.
- **Missing Preset**: Running `npm test` in `server/` fails with "Preset ts-jest not found".
- **UUID Issue**: Known issue with `uuidv4()` in test environment requiring replacement with `crypto.randomUUID()`.
- **Redis Connection**: Tests are attempting to connect to a real Redis instance (localhost:6379) and failing with `ECONNREFUSED`. Global mocking of `ioredis` is required.
- **Missing Files**: Tests rely on missing template files (`server/templates/reports/sample.handlebars`) and Python scripts (`server/ml/er/api.py`).
- **TypeScript Errors**:
    - Import path issues (importing `.ts` extensions).
    - Type mismatches in `dp_sla_enforcer.test.ts`.
    - Module resolution errors for `express`, `neo4j-driver`.

## Test Suites
- Backend: Located in `server/tests/` and `server/src/tests/`.
- Frontend: Playwright tests in `e2e/`.

## Action Items
1. Fix `ts-jest` installation/resolution in `server/`. (Done)
2. Configure Jest for proper ESM support. (In Progress)
3. Mock `ioredis` globally to prevent connection attempts.
4. Fix TypeScript configuration to handle imports correctly.
5. Create missing dummy files for tests or mock the file system access.
6. Fix specific type errors in test files.
7. Enforce stricter CI policies (block on red, coverage).
