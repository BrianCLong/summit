# MC v0.3.9 Contracts

## GraphQL

- SDL: `graphql/schema/mc-admin.graphql`
- Persisted-only: hashes in `graphql/persisted/*.graphql`, manifest resolved during CI.

## OPA Policies

- `policy/mc-admin.rego` + tests in `policy/tests`.

## Gateway

- `gateway/persisted-query-resolver.json` enforces persisted-only & audit headers.

## E2E

- `tests/e2e/admin-console.spec.ts` validates UI → API invariants (persisted-only, provenance headers).

## CI

- `.github/workflows/contract-verify.yml` lints SDL, rebuilds manifest, runs OPA tests, lints Prom rules, and runs Playwright smoke.
