# API Contract Drift Detector

This detector compares OpenAPI specifications against the implemented Express routes, exported types, and validator hints in the codebase. It produces JSON and Markdown reports and fails CI when drift is detected.

## What it checks

- **Routes**: HTTP methods and paths declared in OpenAPI vs. Express handlers discovered in code (including nested routers mounted with `app.use`).
- **Schemas/Types**: Component schema names declared in OpenAPI vs. exported TypeScript types/interfaces/enums/consts in the service `src` tree.
- **Validators**: Flags routes implemented in files that do not reference validation helpers (`safeParse`, `validate`, or `parse(`).

## Usage

```bash
# Fail on drift (default)
node --loader ts-node/esm scripts/api/contract-drift.ts

# Limit to a service
node --loader ts-node/esm scripts/api/contract-drift.ts --service services/graph-core

# Generate reports to custom paths
node --loader ts-node/esm scripts/api/contract-drift.ts --report /tmp/drift.json --markdown /tmp/drift.md
```

### Autofix mode

```bash
node --loader ts-node/esm scripts/api/contract-drift.ts --autofix --no-fail
```

Autofix will:

- Add missing route stubs to the OpenAPI file with placeholder 200 responses.
- Create `openapi-schemas.generated.ts` in the service `src` directory for schemas present in OpenAPI but missing in code.
- Ensure a reusable `AnyValue` schema is available in the OpenAPI spec for placeholder references.

### Output

- Aggregate report: `reports/contract-drift/contract-drift-report.json` (JSON) and `reports/contract-drift/contract-drift-report.md` (Markdown).
- Per-service reports: `reports/contract-drift/<service>-report.{json,md}`.

### CI behavior

The `ci` npm script now runs the drift detector. If drift is found, the command exits non-zero to block the pipeline. Use `--no-fail` locally when exploring.
