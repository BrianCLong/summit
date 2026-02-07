# Repo assumptions for sitrep-2026-02-06-io-espionage

## Verified
- .github/workflows/*
- .github/scripts/*
- src/{api,agents,connectors,graphrag}

## Assumed (verify)
- src/graphrag has Neo4j write adapter
- CI check names: ci-core, ci-pr, ci-security

## Must-not-touch
- .github/workflows/codeql.yml
