# Runbook: Using the Golden Path Service Template

## Goals
- Stand up a compliant service quickly with observability, ABAC, and progressive delivery baked in.
- Provide repeatable steps for local dev → CI → demo environment deployment.

## Local Development
1. Copy the template directory and run `npm install`.
2. Copy `.env.example` to `.env` and adjust values (no inline secrets; point to secret store references in real envs).
3. Start the local stack: `npm run dev:stack` (Compose boots Postgres + Redpanda + API with hot reload).
4. Seed data: `npm run seed` (idempotent; creates demo payments). Reset with `npm run reset:db`.
5. Smoke-test: `curl http://localhost:3000/healthz` and `curl http://localhost:3000/metrics` (disable metrics via `METRICS_ENABLED=false`).
6. Run tests and lint: `npm test && npm run lint`.

## Policy / Step-Up Flow
- Configure OPA bundle with rule `step_up_required` for sensitive actions.
- Call `POST /payments/:id/approve` with headers `x-user-id`, `x-user-roles`, `x-tenant`. If the policy responds with `step_up_required=true`, re-issue with `x-step-up-token` representing WebAuthn/TOTP assertion.
- Decision and outcome are logged; metrics count denials vs approvals. Toggle the route off with `FEATURE_FLAG_SECURE_APPROVAL=false` if not needed.

## CI/CD
1. Push to any branch to trigger `.github/workflows/golden-path-ci.yml` (scoped to this template directory):
   - Lint, test, coverage.
   - Secret scan + SAST.
   - Build container, generate SBOM (syft), run vuln scan (trivy).
   - Sign image with cosign; upload SBOM + reports.
2. Deployment job (manual or on tag) verifies cosign signature and Helm-upgrades the demo environment.
3. Rollback: `helm rollback golden-path <revision>`; pipeline keeps provenance + metrics snapshot as an artifact.

## Observability & SLOs
- Metrics available at `/metrics`; RED dashboards in Grafana reference these metrics and default service labels.
- Example SLOs: availability 99.9%, p95 read latency <300ms, p95 write latency <800ms; configure alert rules via Helm values.

## Compliance Pack
- CI artifacts (SBOM, vulnerability report, cosign attestations) form the disclosure bundle. Store them in the artifact registry bucket with retention 1 year.

## Example PR Flow
1. Branch `feat/payment-step-up`.
2. Commit changes with conventional message, open PR.
3. CI passes and attaches SBOM/vuln reports.
4. Merge triggers deploy to demo with cosign verification; confirm `kubectl port-forward` to hit `/readyz` and `/metrics`.
