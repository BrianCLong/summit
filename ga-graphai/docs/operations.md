# Operations

## Post-deploy verification
- The `post-deploy-verification` workflow attaches to every deploy workflow run (dev, staging, prod, and manual) via `workflow_run` triggers.
- It runs both the k6 smoke script (`.github/k6/smoke.js`) against the deployed UI/API endpoints and the GraphQL load probe (`tests/load/graphql_read_p95.js`).
- When the originating deploy was triggered from a PR, the workflow comments the smoke/load status back on the PR with direct links to the run.
- Endpoint resolution is environment-aware (dev/staging/prod) and fails fast if URLs are missing to avoid silent skips.
