# GA Gate (`ga / gate`)

**Authority:** Platform Engineering
**Last Updated:** 2026-01-10

## Purpose

`ga / gate` is the single, stable composite check for GA-critical readiness. It is the required
branch-protection gate for `main`, aligning release enforcement with the Summit Readiness Assertion
(`docs/SUMMIT_READINESS_ASSERTION.md`).

## Meaning of `ga / gate`

`ga / gate` aggregates all GA-critical signals in a deterministic, non-skippable way. The job
fails if any dependency is missing, skipped, cancelled, or failed.

### Dependency Set (GA-Critical Signals)

| Signal                   | CI Job               | Command/Scope                                                    |
| ------------------------ | -------------------- | ---------------------------------------------------------------- |
| Lint                     | `lint`               | `pnpm lint`, `pnpm lint:cjs`, `scripts/check-error-codes-doc.ts` |
| Typecheck                | `typecheck`          | `pnpm typecheck`                                                 |
| Unit + Integration Tests | `test` (matrix)      | `pnpm test:unit`, `pnpm test:integration`                        |
| Build                    | `reproducible-build` | `pnpm build` (twice, checksum diff)                              |
| Governance               | `governance`         | `npm run check:governance`, governance tests, audit script       |
| Provenance               | `provenance`         | provenance test suite                                            |
| Schema Validation        | `schema-diff`        | `npm run graphql:schema:check`                                   |
| Golden Path Smoke        | `golden-path`        | `make smoke`                                                     |

## Failure Semantics

- **Strict aggregation**: any dependency with `failure`, `cancelled`, `skipped`, `neutral`, or
  missing status blocks `ga / gate`.
- **Missing signal = failure**: a dependency not run is treated as a blocking defect.
- **Deterministic summary**: `ga / gate` prints an ordered summary table of dependency results in
  the job log and step summary.

## Local Reproduction

Run the dependency commands locally to reproduce the composite gate:

```bash
pnpm lint
pnpm lint:cjs
cd server && npx tsx scripts/check-error-codes-doc.ts
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
npm run check:governance
npm test -- --testPathPattern="governance" --bail
npx tsx scripts/governance/audit_ci.ts
npm test -- --testPathPattern="provenance" --bail
npm run graphql:schema:check
make smoke
```

## Waivers / Exceptions

There are **no implicit bypasses** for `ga / gate`. Any deviation must be documented as a
**Governed Exception** in `docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml`, with an issue link, owner, and
expiry, and must pass the existing exception validation workflow.

## How to Interpret Output

`ga / gate` includes a summary table like:

```
| Check | Result |
| --- | --- |
| Lint | success |
| Typecheck | success |
| ... | ... |
```

Anything other than `success` is blocking.
