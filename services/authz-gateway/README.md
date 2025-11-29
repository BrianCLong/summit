# AuthZ Gateway

Node-based authentication and authorization reverse proxy that issues JWTs, exposes JWKS, enriches attribute context, and enforces OPA policies.

## Observability

The gateway emits structured logs via Pino, exports Prometheus metrics on `/metrics`, and initializes OpenTelemetry tracing.

## Development

```bash
npm install
npm run dev

# Run unit tests
npm test

# Focus the governance fuzz harness
npm run test:fuzz
```

## Key Endpoints

- `POST /v1/companyos/decisions:check` – external governance endpoint secured by API
  keys, returns allow/deny decisions with rate limit + quota headers and `trace_id` for
  audit correlation.
- `GET /subject/:id/attributes` – aggregated subject attributes with cache controls.
- `POST /authorize` – returns ABAC decision payload (`allow`, `reason`, `obligations`).
- `POST /auth/webauthn/challenge` & `POST /auth/step-up` – WebAuthn challenge/response for step-up auth tokens.

### External API Quickstart

```bash
# Provide an API key provisioned for your tenant
API_KEY="demo-external-key-123"

curl -X POST http://localhost:4000/v1/companyos/decisions:check \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": { "id": "alice" },
    "action": "dataset:read",
    "resource": { "id": "dataset-alpha" }
  }'

# Response shape
{
  "allow": true,
  "reason": "allow",
  "obligations": [],
  "trace_id": "d3f..."
}

# Governance headers
# X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset
# X-Quota-Limit / X-Quota-Remaining / X-Quota-Reset
```

## Governance Gate Fuzzing

- **Scope:** Exercises the authorization middleware and OPA integration with property-based, mutation-based, and adversarial fuzzing strategies to harden governance gates.
- **Execution:** `npm run test:fuzz` (also included in `npm test` so it runs in CI/CD pipelines).
- **Artifacts:** Detailed run metadata and coverage snapshots are written to `tests/reports/governance-gate-fuzz-report.json` for auditing and vulnerability triage.
- **Coverage Guarantees:** The suite asserts that both `middleware.ts` and `policy.ts` are covered during fuzzing and records per-file coverage deltas inside the generated report.
