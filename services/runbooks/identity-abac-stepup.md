# Identity & Policy ABAC + Step-Up Runbook

## Overview

This runbook documents operational procedures for the ABAC gateway, including attribute cache refresh, policy bundle promotion, and WebAuthn step-up troubleshooting.

## Dashboards

- Grafana: `dashboard/grafana/abac.json` (import into Grafana and wire to `authz_gateway` datasource).
- Key panels: decision latency (p95/p99), cache hit ratio, step-up success rate, challenge replay detections.

## Alerts

- Alertmanager route: `alertmanager/abac-routes.yml` defines SLO burn alerts for latency and availability.
- Pager triggers when `decision_latency_p95_ms > 50` for 5 minutes or `step_up_failure_rate > 5%` for 10 minutes.

## Attribute Cache

1. `GET /subject/:id/attributes?refresh=true` to bypass cache for a subject.
2. `GET /resource/:id/attributes?refresh=true` for resource tag refresh.
3. If IdP sync is stale, redeploy attribute bundle from `services/authz-gateway/src/data/` and invalidate caches.

## Policy Deployments

1. Update Rego under `policy/abac/` and run `opa test policy/abac policy/tests -v`.
2. Package bundle via `tar -czf abac-bundle.tar.gz manifest.yaml abac.rego data.json`.
3. Sign bundle (`openssl dgst -sha256 -sign ...`) and upload to artifact storage.
4. Trigger policy reload on gateway (`POST /admin/policy/reload`) or restart pods.

## Step-Up Troubleshooting

- `POST /auth/webauthn/challenge` should return challenge + allowCredentials. Empty response implies missing registration; check `src/data/webauthn-credentials.json`.
- Verify the challenge signature using `services/authz-gateway/tests/fixtures/webauthn-private.pem` (test key).
- Replay errors (`challenge_already_used`) indicate client reused old challenge; instruct to refresh and re-authenticate.

## Evidence Capture

- Upload OPA coverage JSON and WebAuthn replay logs to `.evidence/abac/` weekly.
- Reference evidence in PR templates via `.prbodies/` entry.
