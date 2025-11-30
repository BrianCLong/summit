# AuthZ Gateway

Node-based authentication and authorization reverse proxy that issues JWTs, exposes JWKS, enriches attribute context, and enforces OPA policies.

## Observability

- **Logs & Metrics:** Structured logs via Pino and Prometheus metrics on `/metrics`.
- **Tracing backends:** OpenTelemetry is enabled with multi-exporter support. Configure Jaeger and/or Zipkin alongside OTLP:
  - `TRACING_EXPORTERS=otlp,jaeger,zipkin`
  - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces`
  - `JAEGER_ENDPOINT=http://jaeger:14268/api/traces` (UI at `http://jaeger:16686`)
  - `ZIPKIN_ENDPOINT=http://zipkin:9411/api/v2/spans` (UI at `http://zipkin:9411`)
- **Sampling:** Use `TRACE_SAMPLE_RATIO` (0–1) or `OTEL_TRACES_SAMPLER` to control rate; defaults to parent-based ratio sampling.
- **Propagation & baggage:** The gateway sets W3C + Jaeger + B3 propagators, injects `traceparent`/`baggage` headers on proxied calls, and enriches baggage with subject, tenant, resource, and action identifiers to correlate spans across services.

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
