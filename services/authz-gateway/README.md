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
```

## Key Endpoints

- `GET /subject/:id/attributes` – aggregated subject attributes with cache controls.
- `POST /authorize` – returns ABAC decision payload (`allow`, `reason`, `obligations`).
- `POST /auth/webauthn/challenge` & `POST /auth/step-up` – WebAuthn challenge/response for step-up auth tokens.
