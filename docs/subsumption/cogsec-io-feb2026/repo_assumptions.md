# Repo Assumptions vs Ground Truth (Feb 2026)

## Verified (via local check)
* Repo exists, MIT, large mono-repo, IntelGraph is core concept in README.
* Required checks policy exists at `docs/ci/REQUIRED_CHECKS_POLICY.yml` and names required contexts (e.g., `CI Core Gate ✅`, `meta-gate`, `Schema compatibility guard / schema-compat`).
* GraphQL typeDefs assembly lives at `server/src/graphql/schema/index.ts` and loads `./cognitive-security.graphql` as schema text.
* `server/src/graphql/schema/cognitive-security.graphql` exists and contains many types. Note: earlier assumed it was a placeholder comment-only file (2 lines), but actual inspection shows a comprehensive schema.
* Evidence ID format patterns exist across the repo (e.g., `EVIDENCE_BUNDLE.manifest.json`).

## Assumed (Must validate further before closing)
* Schema compilation / compatibility gates can be tested locally using `pnpm test` or `pnpm --filter server run build`.
* Evidence bundle schema and pattern conventions are defined and followed correctly.
* The test framework is Jest (based on existing test configuration).

## Scope Guardrails
* No refactors outside cognitive-security schema + minimal glue.
* Max 6 PRs (implemented as single subsumption commit).
* New capability feature-flagged OFF by default.
* Defensive only: detection, modeling, provenance, warnings—no offensive IO tooling.
