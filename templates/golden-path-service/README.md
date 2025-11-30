# Golden Path Service Template

An opinionated TypeScript/Express scaffold with batteries-included observability, ABAC policy checks, and deployment pipeline references.

## Features
- Health/readiness endpoints (`/healthz`, `/readyz`), baseline `/hello` route.
- Structured logging (pino) + request IDs; Prometheus metrics with RED coverage (toggle via `METRICS_ENABLED`).
- OPA/ABAC client with step-up awareness (`/payments/:id/approve`), guarded by feature flag `FEATURE_FLAG_SECURE_APPROVAL`.
- Deterministic Postgres seed/reset scripts for demo data.
- Dockerfile + Compose dev stack; Helm chart for progressive delivery; CI workflow including SBOM + signing.

## Quickstart
1. Copy the folder and run `npm install`.
2. Export envs from `.env.example` and start dev stack: `npm run dev:stack`.
3. Seed demo data: `npm run seed`.
4. Hit `http://localhost:3000/healthz` and `http://localhost:3000/metrics`.
5. Run tests with `npm test` and lint with `npm run lint`.

## Policy / Step-Up Demo
Send `POST /payments/{id}/approve` with headers `x-user-id`, `x-user-roles`, and `x-tenant`. The endpoint calls the configured OPA policy. If `step_up_required=true`, include `x-step-up-token` to simulate WebAuthn/TOTP proof. Disable the route entirely by setting `FEATURE_FLAG_SECURE_APPROVAL=false`.

## Deployment
- Build/push image via CI (`.github/workflows/golden-path-ci.yml`).
- Deploy with Helm chart under `deploy/chart`, using values for canary/stable splits.
- Rollbacks use `helm rollback` and preserve signed image digests.

## Observability
- Metrics exported on `/metrics`; logs carry `requestId`; hook OpenTelemetry exporters via the collector sidecar.
- Default metric labels include `service` for easier dashboard scoping.
