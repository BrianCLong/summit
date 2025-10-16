# Maestro Conductor — Dev/Build Go‑Live Checklist

**Version:** 2025-09-03 01:42 UTC  
**Scope:** Bring Maestro Conductor to _production‑ready quality_ in the **dev** and **build** environments so it can immediately accelerate IntelGraph development.

---

## 0) TL;DR (P0 Only)

- [ ] **Populate and apply Kubernetes _Secrets_ + _ConfigMaps_** for `intelgraph-dev` and (if used) `intelgraph-build`.
- [ ] **Install/verify prerequisites** in the cluster: Argo Rollouts, Prometheus/Alertmanager, Grafana, OpenTelemetry Collector.
- [ ] **Deploy Maestro (canary)** to `intelgraph-dev` using Argo Rollouts; confirm health/readiness.
- [ ] **Wire CI/CD**: GHCR push, SBOM, Cosign keyless signing, env‑scoped deploy jobs, branch protections.
- [ ] **Alerting online**: PagerDuty routing key in Alertmanager; send test alert + silence policy.
- [ ] **Observability online**: p95 latency + 5xx error dashboards; Argo analysis templates bound.
- [ ] **Synthetic smoke tests** green (healthz/readyz + 1 real workflow).
- [ ] **Runbooks**: R1–R5 checked in and discoverable from README.
- [ ] **DR sanity**: backup schedule present; `scripts/dr/restore_check.sh` passes against dev DB.

---

## 1) Prerequisites (Once per cluster)

- [ ] **Namespaces**: `intelgraph-dev` (and `intelgraph-build` if separate).

```bash
kubectl create namespace intelgraph-dev || true
kubectl create namespace intelgraph-build || true
```

- [ ] **Argo Rollouts** (CRDs + controller):

```bash
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl -n argo-rollouts rollout status deploy/argo-rollouts
```

- [ ] **Monitoring stack** (Prometheus Operator, Alertmanager, Grafana) present and **ServiceMonitor** CRD available.
- [ ] **OpenTelemetry Collector** (or vendor agent) reachable at `$OTEL_EXPORTER_OTLP_ENDPOINT`.

---

## 2) Secrets & Config (P0)

> Populate values, then apply to **dev** (repeat for **build** if applicable).

**Required Secrets (typical):**

- `POSTGRES_URL`, `REDIS_URL`
- `JWT_SECRET`, `SESSION_SECRET`
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` _(or AzureAD/Google OIDC)_
- `OTEL_EXPORTER_OTLP_ENDPOINT` _(if using OTLP/HTTP, set protocol flags accordingly)_
- `PAGERDUTY_ROUTING_KEY`
- `GITHUB_TOKEN` _(default Actions token ok for CI; PAT only if needed)_

**Example (dev) — kustomize or raw `Secret` manifest:**

```bash
kubectl -n intelgraph-dev create secret generic maestro-secrets   --from-literal=POSTGRES_URL="postgres://..."   --from-literal=REDIS_URL="redis://..."   --from-literal=JWT_SECRET="change-me"   --from-literal=SESSION_SECRET="change-me"   --from-literal=AUTH0_DOMAIN="example.auth0.com"   --from-literal=AUTH0_CLIENT_ID="..."   --from-literal=AUTH0_CLIENT_SECRET="..."   --from-literal=OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"   --from-literal=PAGERDUTY_ROUTING_KEY="..."   --dry-run=client -o yaml | kubectl apply -f -
```

**ConfigMap (dev) — feature flags and defaults:**

```bash
kubectl -n intelgraph-dev create configmap maestro-config   --from-literal=LOG_LEVEL="info"   --from-literal=FEATURE_FLAGS="canary,oncall,slo,rollbacks"   --from-literal=PUBLIC_URL="https://dev.intelgraph.local"   --dry-run=client -o yaml | kubectl apply -f -
```

---

## 3) Deploy (P0)

> Rollout uses the provided Argo manifest (`deploy/argo/rollout-maestro.yaml`). Adjust image tags and service names for **dev**.

```bash
# Update image (example) before apply
yq -i '.spec.template.spec.containers[0].image = "ghcr.io/brianclong/maestro-control-plane:{TAG_OR_SHA}"' deploy/argo/rollout-maestro.yaml

# Apply
kubectl -n intelgraph-dev apply -f deploy/argo/rollout-maestro.yaml

# Watch
kubectl argo rollouts -n intelgraph-dev get rollout maestro-server-rollout
kubectl argo rollouts -n intelgraph-dev dashboard  # optional UI
```

**Acceptance:** `Available` pods ≥ desired, `/healthz` and `/readyz` 200 OK, Service endpoints reachable.

---

## 4) CI/CD Wiring (P0)

- [ ] **GitHub Actions Secrets/Vars (repo or env‑scoped)**
  - `PAGERDUTY_ROUTING_KEY` (Actions → Secrets)
  - `COSIGN_EXPERIMENTAL=true` (Actions → Vars)
  - `REGISTRY=ghcr.io`, `REGISTRY_OWNER=brianclong` _(if referenced)_
  - OIDC‑based deploy credentials (cloud or kube) **or** in‑cluster deploy via GitHub‑to‑Argo (Webhook/Push).
- [ ] **Pipelines enabled**: build → test → SBOM (Syft) → sign (Cosign keyless) → push → deploy (dev).
- [ ] **Branch protections**: required checks (unit, e2e, sbom, sign, vulnerability scan).

**Smoke job (suggested) snippet:**

```yaml
- name: Synthetic smoke
  run: ./scripts/smoke/synthetic.sh "https://dev.intelgraph.local"
```

**Supply chain:**

- Verify: `cosign verify --certificate-oidc-issuer=https://token.actions.githubusercontent.com ghcr.io/brianclong/maestro-control-plane:{TAG}`

---

## 5) Observability & Alerts (P0)

- [ ] **Argo Analysis** connected to Prometheus queries for **p95 latency** and **5xx rate**.
- [ ] **Grafana dashboards** imported: Service overview, Rollout canary panel, Error budget.
- [ ] **Alertmanager → PagerDuty**: test event reaches on‑call; document routing and silence policy.

**Test Alert (dev):**

```bash
# Fire a one-off test alert via Alertmanager API (example)
curl -XPOST http://alertmanager.intelgraph-dev/api/v2/alerts -H 'Content-Type: application/json' -d '[{"labels":{"alertname":"TestPD","severity":"critical"},"annotations":{"summary":"Test PD route"}}]'
```

---

## 6) Functional Verification (P0)

- [ ] **Synthetic**: `scripts/smoke/synthetic.sh` checks
  - `/healthz`, `/readyz` return 200
  - Minimal real workflow (e.g., create → list → delete a job/run)
- [ ] **E2E happy path** in CI against **dev** URL.
- [ ] **Seed data** loaded; role‑based access tested with at least two roles.

---

## 7) Runbooks (P0)

Document these under `runbooks/` and link from README:

**R1. Rollback / Abort Canary**

- `kubectl argo rollouts -n intelgraph-dev abort maestro-server-rollout`
- `kubectl argo rollouts -n intelgraph-dev promote maestro-server-rollout`

**R2. DB Migration Roll‑Forward/Back**

- How to apply/rollback migrations; expected durations; blast radius; verification SQL.

**R3. OIDC Secret/Cert Rotation**

- Rotate IdP client secrets; update Kubernetes Secret; cache TTLs; user impact.

**R4. On‑Call & PD Triage**

- Alert classes, runbook links, ack/escalation policy, dashboards, common false positives.

**R5. Canary Analysis Tuning**

- How to adjust thresholds/queries; p95/5xx windows; mitigating noisy neighbors.

---

## 8) DR & Data Hygiene (P0)

- [ ] **Backup schedule** exists for dev DB (retention policy documented).
- [ ] **Restore check** (`scripts/dr/restore_check.sh`) passes against latest backup.
- [ ] **Data retention**: `server/src/db/retention/retention.sql` applied; confirm jobs scheduled.

---

## 9) Security & Access (P1 but quick wins)

- [ ] **SSO (dev)** via Auth0/Azure/Google; map IdP groups → RBAC.
- [ ] **Namespace RBAC**: least privilege for CI deployer and operators.
- [ ] **Dependency/Container scanning** (Grype/Trivy) in CI; severity gates.
- [ ] **Provenance/SBOM publishing** on Releases; attach SPDX to GitHub artifacts.

---

## 10) Developer Acceleration (Immediate Impact)

- [ ] **PR Previews**: ephemeral environments per PR (namespace `pr-<num>`), auto‑destroy on merge/close.
- [ ] **`make dev` UX**: one‑command local stack + seed; mirrors cluster defaults.
- [ ] **Feature flags**: fast toggles via ConfigMap; doc how to use them in PRs.
- [ ] **Golden paths**: “How to add a service/node”, “How to ship a change”, “How to read canary graphs” quickstarts.
- [ ] **Bench budgets**: k6 smoke/perf in CI with thresholds that fail PRs when regressed.

---

## 11) P1 Enhancements (next 1–2 days)

- [ ] **Grafana**: add Top N erroring routes, slow queries, PD drilldown link.
- [ ] **OPA/Policy**: baseline allow/deny for risky ops; audit log wiring.
- [ ] **SLOs**: publish target + error budget policy; wire burn‑rate alerts (fast/slow).

---

## 12) Cutover & Comms

- [ ] Announce “Maestro in Dev” with URL, access steps, and escalation.
- [ ] Record a 3‑minute loom/walkthrough for the team.
- [ ] Create “First 5 tasks to try” list tied to PRs to dogfood.

---

## Acceptance Gates (Go/No‑Go for Dev)

- **Green**: canary completes with p95 and 5xx within thresholds; smoke & e2e pass; PD test received; dashboards populated.
- **Yellow**: canary OK but alerts noisy → adjust queries; proceed with caution.
- **Red**: health/ready failing, analysis aborts, or PD unreachable → rollback + fix.

---

## Quick Command Reference

```bash
# Apply secrets/config (dev)
kubectl -n intelgraph-dev apply -f k8s/maestro-dev-secrets.yaml
kubectl -n intelgraph-dev apply -f k8s/maestro-dev-configmap.yaml

# Deploy rollout (dev)
kubectl -n intelgraph-dev apply -f deploy/argo/rollout-maestro.yaml

# Observe canary
kubectl argo rollouts -n intelgraph-dev get rollout maestro-server-rollout
kubectl -n intelgraph-dev describe rollout maestro-server-rollout

# Rollback or promote
kubectl argo rollouts -n intelgraph-dev abort maestro-server-rollout
kubectl argo rollouts -n intelgraph-dev promote maestro-server-rollout

# DR check
./scripts/dr/restore_check.sh "$PGURL"
```

---

### Notes

- Replace example endpoints/secrets with your actual values.
- Repeat the same flow for **build** if it’s a distinct environment.
- Keep this file in the repo under `ops/` or `docs/` and iterate after first run.
