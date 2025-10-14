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

- `GET /subject/:id/attributes` – aggregated subject attributes with cache controls.
- `POST /authorize` – returns ABAC decision payload (`allow`, `reason`, `obligations`).
- `POST /auth/webauthn/challenge` & `POST /auth/step-up` – WebAuthn challenge/response for step-up auth tokens.

## Governance Gate Fuzzing

- **Scope:** Exercises the authorization middleware and OPA integration with property-based, mutation-based, and adversarial fuzzing strategies to harden governance gates.
- **Execution:** `npm run test:fuzz` (also included in `npm test` so it runs in CI/CD pipelines).
- **Artifacts:** Detailed run metadata and coverage snapshots are written to `tests/reports/governance-gate-fuzz-report.json` for auditing and vulnerability triage.
- **Coverage Guarantees:** The suite asserts that both `middleware.ts` and `policy.ts` are covered during fuzzing and records per-file coverage deltas inside the generated report.
