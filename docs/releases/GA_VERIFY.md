# GA Verification Guide

This document describes how to verify GA readiness for the Summit Platform.

## Quick Verification (CI-friendly)

Run the single deterministic verification command:

```bash
pnpm ga:verify
```

This runs:

1. **TypeScript check** (`pnpm typecheck`) - Ensures type safety
2. **Lint** (`pnpm lint`) - Code quality and style checks
3. **Build** (`pnpm build`) - Compiles all packages
4. **Unit tests** (`pnpm --filter server test:unit`) - Runs server unit tests
5. **Smoke tests** (`pnpm ga:smoke`) - Integration smoke hook
6. **Evidence bundle verification** (`make ga-verify`) - Validates SBOM + provenance + checksums in `release-artifacts/`

## Scoped Verification

For faster feedback during development:

```bash
# Server-only gate (fastest)
pnpm ga:verify:server

# Just smoke tests
pnpm ga:smoke
```

| Script             | Scope         | Use Case               |
| ------------------ | ------------- | ---------------------- |
| `ga:verify`        | Full platform | CI gates, pre-release  |
| `ga:verify:server` | Server only   | Backend development    |
| `ga:smoke`         | Integration   | Smoke/integration hook |

### Evidence Bundle Outputs

`pnpm ga:verify` expects the GA evidence bundle to be present in:

```
release-artifacts/
├── sbom.json
├── provenance.json
└── checksums.txt
```

## Full GA Gate (requires Docker)

For comprehensive verification including integration tests and service health:

```bash
make ga
```

This runs:

1. Lint and Unit Tests
2. Clean Environment (docker down)
3. Services Up (docker up)
4. Readiness Check (health probes)
5. Deep Health Check
6. Smoke Tests
7. Security Checks (SBOM, secrets scan)

Reports are generated in `artifacts/ga/`.

## Governance and Compliance

Additional verification for GA compliance:

```bash
pnpm verify:governance
pnpm verify:living-documents
pnpm generate:sbom
pnpm generate:provenance
```

## CI Integration

The GA verification is integrated into CI workflows:

- `CI.yml` - Primary gate using `pnpm ga:verify`
- `supply-chain-integrity.yml` - SBOM and vulnerability scanning
- `ga-readiness.yml` - Full GA gate checks

## Evidence Collection

To collect GA evidence for release:

```bash
make ga                          # Run full gate
cat artifacts/ga/ga_report.json  # View results
cat artifacts/ga/ga_report.md    # Human-readable report
```

## Troubleshooting

If verification fails:

1. **TypeScript errors**: Run `pnpm typecheck` directly to see full error output
2. **Lint failures**: Run `pnpm lint` to see specific violations
3. **Build failures**: Check `pnpm build` output for compilation errors
4. **Test failures**: Run `pnpm --filter server test` for detailed test output

For service health issues, check:

```bash
make logs      # View docker logs
make health    # Run health checks
```
