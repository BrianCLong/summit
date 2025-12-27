# Maestro Conductor — Production Go‑Live Runbook (IntelGraph)

**Purpose**: Execute a production rollout of Maestro Conductor safely, with instant rollback, objective SLO gates, and auditable verification. This runbook yields a **GO/NO‑GO decision** in ~60 minutes for first cutover, then standardizes subsequent releases.

---

## 0) Scope & Preconditions

- Target: `maestro-server` (control plane), IntelGraph cluster `<cluster-name>` namespace `<ns>`.
- Release artifact: container image `ghcr.io/<org>/maestro-control-plane:<tag>` (cosign‑signed) + SBOM artifact from GitHub Actions.
- Argo Rollouts CRDs installed and CLI available.
- Prometheus + Alertmanager reachable from cluster; PagerDuty routing key provisioned as secret/env.
- Stable/Canary Kubernetes Services (or Ingress annotations) exist for traffic splitting.
- Postgres backup regime in place (PITR or nightly). Ability to run `scripts/dr/restore_check.sh` against a **restored** database.
- Temporary controls if SSO/SCIM not yet wired: admin account rotation completed, admin IP allowlist enabled (ingress), API keys rotated, audit sink active.

**GO if** all checks in Sections 1–4 pass. **NO‑GO** if any P0 check fails; rollback immediately per Section 5.

---

## 1) Preflight Validation (15–20 min)

### 1.1 Cluster & Manifests

```bash
# Argo Rollouts CRDs present
kubectl get crd | grep rollouts.argoproj.io

# Namespace context
kubectl config set-context --current --namespace <ns>

# Stable/Canary services exist (adjust names if different)
kubectl get svc maestro-server maestro-server-canary
```

### 1.2 Observability & Alerts

```bash
# Server metrics endpoint is healthy
kubectl port-forward deploy/maestro-server 4000:4000 &
curl -sSf http://localhost:4000/metrics | head

# Prometheus up
kubectl -n <prom-ns> get pods -l app.kubernetes.io/name=prometheus

# Alertmanager ready
kubectl -n <am-ns> port-forward svc/alertmanager 9093:9093 &
curl -sSf http://localhost:9093/-/ready
```

### 1.3 PagerDuty Wiring (synthetic)

> **Caution**: Creates a real PD incident. Use a maintenance window or a dedicated test service.

```bash
# Inject a synthetic alert into Alertmanager to exercise the PD route
curl -sS -XPOST http://localhost:9093/api/v2/alerts \
 -H 'Content-Type: application/json' \
 -d '[{"labels": {"alertname": "PD_Synthetic", "severity": "warning"},
       "annotations": {"summary": "Synthetic route test"}}]'
# Confirm incident opened in PD UI, then resolve/ack to clear.
```

### 1.4 Supply‑Chain Integrity (Cosign + SBOM)

```bash
# Resolve image digest and verify keyless signature from GitHub Actions OIDC
cosign triangulate ghcr.io/<org>/maestro-control-plane:<tag>
# outputs: ghcr.io/<org>/maestro-control-plane@sha256:<digest>
cosign verify \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp 'https://github.com/.*/actions' \
  ghcr.io/<org>/maestro-control-plane@sha256:<digest>

# SBOM present in CI artifacts (manual check acceptable for first cut)
# GitHub → Actions → run for <tag> → artifact named like sbom-spdx.json
```

### 1.5 Data: DR & Retention

```bash
# DR: run restore check against restored DB target (not prod)
PGURL=postgres://user:pass@restored-host:5432/db \
  ./scripts/dr/restore_check.sh

# Retention CronJob installed
kubectl get cronjob retention-cronjob
# Run one immediately and inspect logs
kubectl create job --from=cronjob/retention-cronjob retention-now-$(date +%s)
kubectl logs -l job-name=retention-now-$(date +%s) --tail=200
```

### 1.6 PII Redaction Sanity

```bash
# Send a request that would log fields if not redacted (choose any POST route)
curl -sS -X POST http://<ingress-host>/api/maestro/v1/invoke \
 -H 'Content-Type: application/json' \
 -d '{"input":{"email":"alice@example.com","phone":"415-555-1212","ssn":"123-45-6789"}}'
# Ensure logs do NOT contain raw PII
kubectl logs deploy/maestro-server | tail -n 300 | \
  grep -E 'alice@example|415-555-1212|123-45-6789' && echo 'PII FOUND (FAIL)' || echo 'PII REDACTED (OK)'
```

---

## 2) Canary Rollout Execution (Argo Rollouts) (20–30 min)

### 2.1 Apply Rollout & Confirm Baseline

```bash
# Apply rollout manifest
kubectl apply -f deploy/argo/rollout-maestro.yaml

# Check rollout object
kubectl argo rollouts get rollout maestro-server -o wide
```

### 2.2 Progressive Steps & SLO Analysis

- Strategy: 10% → 25% → 50% → 100% with pauses.
- Analysis: Prometheus queries evaluate **5xx rate < 0.5%/5m** and **route p95 < 1.5s** for key endpoints.

```bash
# Watch the rollout and analysis results live
kubectl argo rollouts watch maestro-server

# If paused, manually promote once SLOs are green
kubectl argo rollouts promote maestro-server
```

**NO‑GO**: If any analysis fails or error budget burn accelerates, the rollout will auto‑rollback. Investigate, fix, retag, and retry.

---

## 3) Functional & Load Validation (10–20 min)

### 3.1 Smoke (scripted)

```bash
./scripts/smoke/opa_mcp_prom_grafana.sh
```

Expect: OPA reachable, MCP endpoints 200/OK, Prometheus and Grafana reachable.

### 3.2 k6 Load/Soak (quick gating)

```bash
# Short gate
BASE=https://<ingress-host>/api/maestro/v1 \
  k6 run --vus 20 --duration 5m scripts/k6/mcp_suite.js
```

Thresholds: p95 < 800ms; error rate < 0.5%. (Run a 30–60m soak in staging or during a maintenance window.)

---

## 4) Acceptance Criteria (hard gates)

- **Availability/Errors**: API 5xx < 0.5% over the canary window; no alert flaps.
- **Latency**: p95 for critical routes < 1.5s.
- **Observability**: Metrics scraped; alerts firing to PD on synthetic; dashboards show live traffic.
- **Supply chain**: Cosign verify OK; SBOM attached to release.
- **Data Safety**: DR restore check passes; retention job runs successfully.
- **Privacy**: PII is redacted in logs.

If all above = PASS → **GO**. Any FAIL → **NO‑GO** and rollback (Section 5).

---

## 5) Rollback Procedure (instant)

```bash
# Abort the active canary and revert to last stable
kubectl argo rollouts abort maestro-server
kubectl argo rollouts promote --to-revision <previous-revision> maestro-server

# Confirm traffic back to stable (weight = 100%)
kubectl argo rollouts get rollout maestro-server -o yaml | grep -A5 trafficRouting
```

Post‑rollback: keep incident open until root cause found; attach PromQL screenshots and server logs; open a follow‑up ticket.

---

## 6) Ownership & Comms (RACI)

- **Release Driver**: <name> (approver for GO/NO‑GO)
- **SRE (Argo/Cluster)**: <name>
- **App On‑Call**: <name>
- **SecOps (Cosign/SBOM/PII)**: <name>
- **Data (DR/Retention)**: <name>
- **Stakeholder Comms**: <name>

Channels:

- Slack `#intelgraph‑deploys` for live updates.
- PagerDuty services: App + Platform (escalation via Alertmanager).

---

## 7) Post‑Deploy (within 24h)

- Tune SLO thresholds with real prod baselines.
- Schedule recurring **DR game day**; store restore artifacts in WORM storage.
- Enable retention CronJob on prod schedule.
- Finalize SSO + SCIM + MFA integration and deprecate temp admin controls.
- Add CI job to **cosign verify** before promotion and to upload SBOM to your artifact registry.
- Extend k6 to cover authenticated flows and session lifecycles; run 4h soak off‑peak.

---

## Appendix — Command Cheat Sheet

```bash
# Switch namespace and view rollout
kubectl config set-context --current --namespace <ns>
kubectl argo rollouts get rollout maestro-server

# Promote to next step / full
kubectl argo rollouts promote maestro-server

# Abort and rollback
kubectl argo rollouts abort maestro-server
kubectl argo rollouts promote --to-revision <n> maestro-server

# Trigger retention job now
kubectl create job --from=cronjob/retention-cronjob retention-now-$(date +%s)

# Cosign verify (keyless)
cosign triangulate ghcr.io/<org>/maestro-control-plane:<tag>
cosign verify --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp 'https://github.com/.*/actions' \
  ghcr.io/<org>/maestro-control-plane@sha256:<digest>
```
