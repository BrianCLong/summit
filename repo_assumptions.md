## Repository Assumptions and Validations

### Verified
* **Package Manager**: `pnpm` (verified via `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`).
* **DB Drivers**: `pg` and `neo4j-driver` are present in `package.json` dependencies.
* **Test Runner**: `vitest` is present in `devDependencies`, but integration tests use `tsx` for direct execution as per blueprint.
* **CI**: GitHub Actions is used (`.github/workflows` populated).
* **Directory Structure**: `tools/` exists, `tests/` exists.

### Assumed
* **Node Version**: CI environment supports Node 20 (used in workflow definition).
* **Docker Services**: `postgres:15` and `neo4j:5.12.0` images are available and sufficient for parity checks.
* **APOC**: Neo4j APOC plugin is enabled in CI service definition (added to workflow).
* **Network**: Localhost ports 5432 and 7687 are available in CI runner services network.

### Constraints Respected
* **Production Deployment**: No changes made to production workflows.
* **Secrets**: No new secrets hardcoded; workflow uses standard env vars (with defaults for CI services).
* **Refactor**: No refactor of existing ETL/sync logic performed.
* **Read-Only**: Validator is read-only.
