# Repository Assumptions (Goodfire Series B Monitoring Workstream)

## Readiness Assertion
This workstream executes under the Summit Readiness Assertion and its evidence-first gating
expectations. Delivery remains deterministic and governed.

## Verified (from canonical path map)
- CI workflows live under `.github/workflows/` with scripts in `.github/scripts/` and policies in
  `.github/policies/`.
- Module roots include `src/api/{graphql,rest}`, `src/agents`, `src/connectors`, `src/graphrag`.
- Documentation roots include `docs/{architecture,api,security}` with additional governance and ops
  layers.
- Test commands in scope: `pnpm test`, `pnpm test:e2e`, `pnpm test:coverage`.

## Assumptions (to be validated before PR-2)
- Exact CI workflow entrypoints and check names for PR gating.
- Whether scheduled workflows already exist for drift monitoring.
- The current GraphRAG evidence storage location and schema conventions.
- Neo4j schema support for `EvaluationRun` nodes or equivalent.

## Must-Not-Touch (until verified)
- `.github/workflows/_reusable-*.yml` templates.
- Existing policy bundles under `.github/policies/`.

## Next Verification Actions
- Confirm CI entrypoint workflow names and required checks.
- Confirm test runner conventions and snapshot/determinism policies.
- Confirm evidence node schema and GraphRAG ingestion path.
