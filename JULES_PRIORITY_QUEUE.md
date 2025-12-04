# Jules Priority Queue

## Section 1: Security & Reliability

### 1. [Security] Strict OIDC Verification
**Context:** `server/src/middleware/opa-abac.ts` has a TODO for implementing proper OIDC validation.
**Prompt:**
1. Open `server/src/middleware/opa-abac.ts`.
2. Locate the TODO: `// TODO: Implement proper OIDC validation with issuer verification`.
3. Implement the validation logic using a standard library (e.g., `openid-client` or manual JWT claim checks) to verify the issuer matches the expected configuration.
4. Ensure the validation fails securely if the issuer is mismatching.
5. Verify changes with a test case simulating a forged issuer.

### 2. [Security] ABAC Mutation Detection
**Context:** `server/src/middleware/opa-abac.ts` needs to distinguish between queries and mutations for granular policy enforcement.
**Prompt:**
1. Open `server/src/middleware/opa-abac.ts`.
2. Locate `// TODO: Detect mutation vs query`.
3. Implement logic to parse the GraphQL operation AST or request body to determine if it is a `query`, `mutation`, or `subscription`.
4. Pass this `operation_type` to the OPA evaluation context.
5. Verify with unit tests for both query and mutation requests.

### 3. [Security] PII Audit Logging
**Context:** `server/src/pii/redactionMiddleware.ts` requires logging audit entries to a hash chain for immutability.
**Prompt:**
1. Open `server/src/pii/redactionMiddleware.ts`.
2. Locate `// TODO: Log audit entry to hash chain`.
3. Integrate with `server/src/provenance/ledger.ts` (or equivalent audit service) to record when PII redaction occurs.
4. Ensure the log entry includes the field redacted and the timestamp, but NOT the sensitive data itself.

### 4. [Security] Trust Contract Signature Verification
**Context:** `server/src/conductor/contracts/trust.ts` has a placeholder for signature verification.
**Prompt:**
1. Open `server/src/conductor/contracts/trust.ts`.
2. Locate `// TODO: Verify signature against provider's registered key (PKI/cosign)`.
3. Implement cryptographic signature verification using the provider's public key.
4. Throw a critical error if verification fails.

### 5. [Reliability] Adaptive Rate Limiting Metrics
**Context:** `server/src/middleware/TieredRateLimitMiddleware.ts` needs system metrics to function adaptively.
**Prompt:**
1. Open `server/src/middleware/TieredRateLimitMiddleware.ts`.
2. Locate `// TODO: Monitor system metrics (CPU, memory, query latency)`.
3. Integrate with `server/src/utils/metrics.ts` or `os` module to fetch current load.
4. Adjust rate limits dynamically based on these metrics (e.g., lower limits when CPU > 80%).

### 6. [Reliability] Idempotency Error Tracking
**Context:** `server/src/middleware/idempotency.ts` is missing error rate tracking.
**Prompt:**
1. Open `server/src/middleware/idempotency.ts`.
2. Locate `// TODO: Track error rate in metrics`.
3. Implement a counter or gauge using the telemetry system to track idempotent request failures.
4. Ensure metrics are flushed correctly.

### 7. [Reliability] OPA Cache Metrics
**Context:** `server/src/middleware/opa-enforcer.ts` has a hardcoded cache hit rate.
**Prompt:**
1. Open `server/src/middleware/opa-enforcer.ts`.
2. Locate `cacheHitRate: 0, // TODO: Track cache hits/misses`.
3. Implement real calculation of cache hit rate based on the internal cache state.
4. Log or export this metric for observability.

### 8. [Reliability] Real Neo4j Connection for NL-to-Cypher
**Context:** `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts` uses a mock connection.
**Prompt:**
1. Open `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts`.
2. Locate `// TODO: Integrate with actual Neo4j sandbox connection`.
3. Replace the mock/placeholder with the actual `Neo4jService` or driver instance from `server/src/db/neo4j.ts`.
4. Ensure environment variables for connection are used.

---

## Section 2: CI/CD & Dev Env

### 9. [DevEnv] Fix Dev Environment CLI Tools
**Context:** Developers report missing `turbo` and `vite` commands.
**Prompt:**
1. Create a script `scripts/fix-dev-env.sh`.
2. The script should check for `turbo` and `vite` globally.
3. If missing, install them or create local aliases to `node_modules/.bin`.
4. Update `package.json` scripts to prefer local binaries (e.g., `npx turbo` instead of `turbo`) to be environment agnostic.

### 10. [DevEnv] Robust Start Script
**Context:** `npm run dev` is unreliable due to turbo issues.
**Prompt:**
1. Modify `package.json` `dev` script.
2. Create a fallback mechanism: if `turbo` fails or is missing, use `concurrently` or a simple shell script to start `server` and `client` in parallel.
3. Verify this works by running `npm run dev` in the sandbox.

### 11. [CI] Prune Duplicate Workflows
**Context:** `.github/workflows` contains `ci.yml`, `ci.main.yml`, `ci-main.yml`.
**Prompt:**
1. Analyze `ci.yml`, `ci.main.yml`, and `ci-main.yml` to see which is active/canonical.
2. Merge any unique steps from the duplicates into the main `ci.yml`.
3. Delete the redundant files to reduce confusion.

### 12. [CI] Enforce PR Runbook Card
**Context:** AGENTS.md mentions `docs/pr-runbook-card.md` but it's not strictly enforced.
**Prompt:**
1. Update `.github/workflows/pr-validation.yml` (or create it).
2. Add a step that checks the PR body for the presence of the runbook checklist/content.
3. Fail the build if the runbook is missing, prompting the user to add it.

### 13. [CI] Pre-commit Sanitization
**Context:** `scripts/pr_sanitize.sh` exists but needs to be run automatically.
**Prompt:**
1. Add a `pre-commit` hook (using `husky` or similar if configured) that runs `scripts/pr_sanitize.sh`.
2. Ensure this script prevents committing large binaries or secrets.

### 14. [DevEnv] Regenerate GraphQL Types
**Context:** `client/src/hooks/usePrefetch.ts` has TODOs about missing schema.
**Prompt:**
1. Run the GraphQL code generator (check `package.json` for `codegen` script).
2. If it fails, fix the configuration to point to the correct schema source.
3. Update `client/src/hooks/usePrefetch.ts` to use the generated types and remove the TODOs.

---

## Section 3: Core Summit OSINT

### 15. [Feature] IntelGraph Layout Logic
**Context:** `client/src/components/IntelGraphWorkbench.tsx` needs layout algorithms.
**Prompt:**
1. Open `client/src/components/IntelGraphWorkbench.tsx`.
2. Locate `// TODO: Implement layout logic here (dagre, radial)`.
3. Import `dagre` (add dependency if missing) or use a graph library's layout engine.
4. Implement a function to organize nodes either hierarchically (dagre) or radially.
5. Connect this to a UI toggle.

### 16. [Feature] IOC Detail Navigation
**Context:** `client/src/pages/IOC/IOCList.tsx` has broken navigation.
**Prompt:**
1. Open `client/src/pages/IOC/IOCList.tsx`.
2. Locate `// TODO: Navigate to IOC detail page`.
3. Use `react-router-dom`'s `useNavigate` to redirect to `/ioc/:id` on row click.
4. Ensure the route exists in the router configuration.

### 17. [Feature] Embedding Service Integration
**Context:** `server/src/conductor/steps/embedUpsert.ts` is a placeholder.
**Prompt:**
1. Open `server/src/conductor/steps/embedUpsert.ts`.
2. Locate `// TODO: call Python/HTTP embedding generator; placeholder`.
3. Implement an HTTP call (using `axios` or `fetch`) to the Python embedding service (likely port 8000 or similar, check `docker-compose.yml`).
4. Handle errors and retries.

### 18. [Feature] Graph Tooltips
**Context:** `client/src/components/IntelGraphWorkbench.tsx` needs tooltips.
**Prompt:**
1. Open `client/src/components/IntelGraphWorkbench.tsx`.
2. Locate `// TODO: Show tooltip on hover`.
3. Implement a tooltip component that displays node properties when hovered.
4. Ensure it follows the mouse or is anchored to the node.

### 19. [Feature] Result List Navigation
**Context:** `client/src/pages/Search/components/ResultList.tsx` has missing navigation.
**Prompt:**
1. Open `client/src/pages/Search/components/ResultList.tsx`.
2. Locate `/* TODO: Navigate to detail page */`.
3. Implement navigation to the specific entity's detail view based on its type (Person, Org, Event, etc.).

### 20. [Feature] LLM Usage Tracking
**Context:** `server/src/middleware/llm-preflight.ts` needs tenant-aware tracking.
**Prompt:**
1. Open `server/src/middleware/llm-preflight.ts`.
2. Locate `// TODO: Implement usage tracking per user/tenant`.
3. Extract `tenantId` from the request context.
4. Increment a usage counter in Redis or the database for that tenant.
5. (Optional) Check against a quota before proceeding.
