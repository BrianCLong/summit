# Repo Reality Check

## Verified conventions
* Node.js 18+
* TypeScript
* pnpm
* GitHub Actions
* GraphRAG pipeline
* Neo4j + Qdrant
* ingestion connectors

## Expected directories
```
summit/
 ├ src/ingest/
 ├ src/graphrag/
 ├ src/agents/
 ├ src/sdk/
 ├ src/data-pipeline/
 ├ scripts/
 ├ docs/
 └ .github/
```

## Must-not-touch
```
.github/workflows/codeql.yml
.github/workflows/ci-security.yml
package-lock / pnpm lock
core auth modules
```
