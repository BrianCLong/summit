# Maestro Conductor Production Readiness Runbook

This runbook details the final steps and verification for declaring Maestro Conductor "production-ready" in dev/build environments.

## 1. Overview

This document outlines the critical path to go-live, focusing on secrets management, deployment, CI/CD integration, observability, and security hardening.

## 2. Go/No-Go Delta - Do these now (fast path)

### 2.1. TLS, DNS, and Ingress Hygiene

- **Cert-manager**: Ensure a valid issued cert for your host(s), HSTS on, HTTP→HTTPS redirect.
- **Ingress**: Enable rate-limit & slowloris protection; set server-snippet to cap request size if uploads aren't expected.

**Action / Proof**

```bash
kubectl -n intelgraph-dev get certificate,challenge,order
curl -I https://$MAESTRO_HOST_STAGING | grep -E "Strict-Transport-Security|200|301"
```

### 2.2. Kill or Cage the API-key Stop-Gap

For prod/staging: set `ENABLE_API_KEYS=0`. If you must keep it temporarily:

- Scope by CIDR allow-list and rate-limit that route.
- Store keys only in a cluster secret with rotation date; redact in logs.

**Action / Proof**

```bash
kubectl -n intelgraph-dev get cm maestro-config -o yaml | grep ENABLE_API_KEYS
kubectl -n intelgraph-dev annotate ingress maestro nginx.ingress.kubernetes.io/limit-rps="5" --overwrite
```

### 2.3. OIDC/SSO Path and RBAC

Lock in the target SSO (e.g., Okta/Auth0/Cognito) timeline; ensure app RBAC roles exist now so JWTs map cleanly later.

**Action / Proof**

- `docs/runbooks/prod-readiness-runbook.md` (this file) → add SSO cutover steps + roll-back.
- Confirm role → permission map exists in repo (`docs/security/rbac.md`).

### 2.4. SLOs + Paging Burn Alerts (tie to your blackbox)

Write the SLO doc (availability + p95 TTFB targets), then add error-budget burn rules so PagerDuty fires on exhaustion, not just single spikes.

**Action / Proof**

```bash
# e.g., 4h burn alert on availability
(1 - avg_over_time(probe_success{job="blackbox",instance="https://$MAESTRO_HOST_STAGING/health"}[4h])) > (1 - 0.995)
```

Ensure new alert routes to the same PagerDuty service as your TestPage.

### 2.5. Supply-Chain Hardening Gates in CI

You’ve got SBOM + Cosign sign; now enforce:

- Cosign verify as a deploy gate (fail CD if signature missing).
- Trivy/Grype scan: fail on CRITICAL (allowlist file for temporary exceptions).
- Base images pinned by digest (no floating tags).

**Action / Proof**

```bash
# in CD job, before rollout
- name: Verify image signature
  run: cosign verify --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
       ghcr.io/brianclong/maestro-control-plane@${{ steps.meta.outputs.digest }}
- name: Trivy
  run: trivy image --exit-code 1 --severity CRITICAL GHCR_IMAGE@${{ steps.meta.outputs.digest }}
```

### 2.6. Runtime & Network Policies (tighten blast radius)

- **PodSecurity**: `runAsNonRoot`, `drop caps`, `read-only FS`, `seccomp/AppArmor profiles`.
- **NetworkPolicy**: Only allow egress to DB/Redis/OTEL/PD/Prometheus, deny all else.
- **HPA/PDB**: Set min/max & disruption budgets for safe rollouts.

**Action / Proof**

```bash
kubectl -n intelgraph-dev get networkpolicy,pdb
kubectl -n intelgraph-dev get deploy/rollout -o yaml | rg -n "readOnlyRootFilesystem|runAsNonRoot"
```

### 2.7. Backups & Restore Drill (not just the smoke)

Schedule automated DB snapshots, keep retention policy, and run a restore rehearsal into a scratch DB.

**Action / Proof**

```bash
PGURL="$PGURL_RESTORE_TARGET" ./scripts/dr/restore_check.sh  # against fresh restore
```

### 2.8. Observability Completeness

Correlation IDs end-to-end (ingress → app logs → traces). Log redaction for secrets/PII.
Grafana: add a “Rollout Control” board (phase, weight, 5xx, p95, error budget) + a “Dependency” board (Neo4j, Postgres, Redis).

**Action / Proof**
One request shows same `X-Correlation-Id` in ingress log, app log, and trace span.

### 2.9. Release Process Hygiene

Tag strategy: `vYYYY.MM.DD-buildN` (immutable), promote via image digest, not tag.
Protected branches & required checks already set—add “Change ticket / rollout plan” fields to PR template.

## 3. Day-1 Developer Acceleration (fast wins)

### 3.1. Ephemeral Preview Envs per PR

Use your Helm overlay to spin `preview-<PR#>` with:

- short-lived TLS host (`pr-<n>.maestro.<domain>` via ExternalDNS)
- seeded demo data; blackbox checks bound to that host

```bash
./scripts/deploy-maestro-helm.sh --env preview --host pr-123.maestro.intelgraph.ai --image-tag sha-${GITHUB_SHA}
```

### 3.2. Golden Path DX

- `just new-flow <name>` scaffolds a new Maestro flow node, test, and doc stub.
- `just record-demo` runs k6 + captures trace profile for shareable demo.

### 3.3. Policy Guardrails

- **Gatekeeper/OPA**: Deny deploy if no cosign, no read-only FS, or no NetworkPolicy.
- **Exception policy**: Requires ticket + expiry label.

### 3.4. Chaos Lite on Canary

Delete a canary pod and inject 200ms latency between ingress and app; verify Argo analysis catches it and halts promotion.

### 3.5. Cost Guardrails

Requests/limits sized to keep CA stable; log/trace retention caps; alert on Prometheus TSDB growth.

## 4. Final “Go/No-Go” Checks (copy/paste)

- **Rollout health through all steps**: `kubectl argo rollouts get rollout maestro-server-rollout -n intelgraph-dev`
- **TLS & HSTS**: `curl -I https://$MAESTRO_HOST_STAGING | egrep "200|301|Strict-Transport-Security"`
- **SLO panels populated**: `open "https://$GRAFANA_HOST/d/maestro-rollout"`
- **PD burn alert test**: Create a 4h-burn test rule; confirm PagerDuty incident opens & auto-resolves; then remove.
- **Supply chain gates**: `cosign verify GHCR_IMAGE@DIGEST`, `trivy image --exit-code 0 GHCR_IMAGE@DIGEST`
- **Runtime & network policies enforced**: `kubectl -n intelgraph-dev get networkpolicy,pdb`, `kubectl -n intelgraph-dev get deploy,rs,po -o yaml | rg -n "readOnlyRootFilesystem|runAsNonRoot"`
- **Backups & restore drill**: `PGURL="$PGURL_RESTORE_TARGET" ./scripts/dr/restore_check.sh`

## 5. Conclusion

You’re one security hardening pass + SLO burn alerts + TLS/ingress hygiene away from calling this prod-ready in dev/staging. Flip API-keys off, wire the SLO burn paging, prove restore, and you can confidently let Maestro start accelerating IntelGraph development today (with PR preview envs as your force multiplier).
