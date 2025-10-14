```markdown
---
slug: sprint-2025-09-29-bravo
version: v2025.09.29-b1
cycle: Sprint 24 (2 weeks)
start_date: 2025-09-29
end_date: 2025-10-10
owner: Release Captain (you)
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Repo Maintainer / Arborist
  - Merge & Release Captain
objectives:
  - "Ship progressive delivery & rollback automation end-to-end across dev→stage→prod."
  - "Tighten security/compliance gates (SBOM, SCA/SAST, secret scanning) to fail-fast."
  - "Raise observability baseline: OTEL traces+metrics, p95 < 1.5s for key paths, SLO burn alerts."
  - "Instantiate DR drill and verify RTO/RPO for primary data stores."
---

# Sprint Plan — DevOps • CI/CD • Deployment (Royalcrown IG)

This sprint plan is derived from the uploaded repos `summit-main` (and the 2025.09.23.1710 bundle). Evidence observed:

- **CI Workflows present**: `ci.yml`, perf (`ci-performance-k6.yml`), ZAP (`ci-zap.yml`), SBOM (`sbom.yml`), deploy (`deploy.yml`).
- **IaC present**: Terraform for AWS/GCP (`infra/aws`, `infra/envs/prod`, `deploy/terraform/modules/eks-gpu`), Route53 failover, DR replica stubs.
- **Helm present**: charts for `maestro`, `monitoring`, `intelgraph`, `gateway`, and app-level `charts/app/values.yaml`.
- **Containers**: Many service Dockerfiles (api-gateway, ingest, docs-api, prov-ledger, etc.).

> Mandate: progressive delivery with canaries + automatic rollback; observability-first; sealed secrets; immutable audit; preview env per PR; policy-as-code.

---

## 0) Sprint Readiness (Definition of Ready)
- [ ] Issues scoped with acceptance criteria & owner
- [ ] Risk list & rollback plan documented for each risky change
- [ ] Observability deltas noted (traces/metrics/logs)
- [ ] Data migrations behind explicit gates (no auto-apply)
- [ ] Preview environment template updated & reproducible

---

## 1) Swimlanes & Tracks

### A. CI/CD (CI/CD Engineer)
1. **Unify CI entrypoint (`ci.yml`)**
   - Normalize Node 20.x matrix and PNPM version.
   - Enforce required jobs: lint → unit → contract → build → SBOM → SAST/SCA → container scan → e2e → perf (k6) → ZAP.
2. **Preview Environments per PR**
   - Spin ephemeral namespace via Helm values overlay; destroy on merge/close.
   - Seed ephemeral Postgres with masked fixtures.
3. **Policy Gates**
   - Block merge if: SBOM unknown highs, SAST criticals, dependency vulns w/o allowlist.
   - Enforce migration gate artifact attached (see §4).

### B. Deployment & Progressive Delivery (Deployment Engineer)
1. **Canary rollouts via Helm**
   - Introduce rollout steps with baked health checks on golden signals.
   - Auto-rollback on SLO breach or error budget burn.
2. **Feature Flags**
   - Default-safe toggles for any risky runtime path. Ensure Admin Console reflects defaults.
3. **Post-deploy Verification**
   - Smoke: /health, /ready, /metrics; sample user path; audit log presence.

### C. Observability & SLOs (Platform Engineer)
1. **OTEL Tracing** across gateway, ingest, docs-api; propagate traceparent; add key spans.
2. **Prometheus & Alerting**: p95 latency, error rate, saturation; burn-rate alerts (2× and 10× windows).
3. **Structured Logging**: request_id, user_id (hashed), feature_flag_state, data_version.

### D. Security & Compliance (Platform + CI/CD)
1. **Secrets**: migrate to sealed-secrets; remove plaintext from CI/compose.
2. **Scanning**: gitleaks pre-commit; container scanning in CI; SBOM attestation published.
3. **OPA Gatekeeper**: block privileged pods, hostPath, :latest tags, missing probes.

### E. DR/Resilience (Platform)
1. **Cross-Region Replicas** for primary DB; PITR verified.
2. **Failover Drill** in stage; document RTO/RPO evidence.

### F. Repo Arborist (Maintainer)
- Branch protections; squash strategy; CODEOWNERS refresh; label taxonomy; stale branch pruning.

---

## 2) Deliverables & Artifacts

### 2.1 Sprint Goals (measurable)
- Error budget burn under control: no red burn alerts during canaries for 48h.
- p95 < 1.5s on `GET /search`, `POST /ingest`, `GET /docs/:id` in stage.
- All services emitting OTEL traces with 80%+ parent-child linkage.
- SBOM generated and uploaded for every image; 0 critical vulns at release cut.
- DR drill executed on stage with observed **RTO ≤ 15 min**, **RPO ≤ 5 min**.

### 2.2 Definition of Done (DoD)
- Green CI across all policy gates; infra plan reviewed; helm lint clean.
- Canary + rollback validated; migration gates exercised; dashboards reviewed.
- Immutable audit trail includes user-visible notes; runbooks updated.

### 2.3 Risk Register
| Risk | Probability | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Canary false positives from noisy metrics | M | M | Use multi-window burn & require dual signal breach | Platform |
| Secret exposure in archived workflows | L | H | Gitleaks sweep + delete/rewrite history, rotate tokens | CI/CD |
| DB migration lock during deploy | M | H | Gate + preflight `--dry-run`, toggle feature flags, backout SQL | Deploy |
| k6 perf flakiness | M | M | Warm caches, fixed test data, threshold on trend not point | CI/CD |

---

## 3) Backlog (sprint-scoped)

### EPIC-1: Progressive Delivery & Rollback
- [ ] HELM-101: Add canary strategy values to `charts/app/values.yaml` with stepwise traffic 10→30→60→100 and metric guard.
- [ ] HELM-102: Add readiness/liveness probes to all deployments missing them.
- [ ] ROLL-103: Implement automated rollback job triggered by burn alert label.

### EPIC-2: Preview Environments
- [ ] PREV-201: Namespace-per-PR workflow; TTL 72h after close.
- [ ] PREV-202: Seed ephemeral Postgres with masked fixtures via Job.
- [ ] PREV-203: Public URL with weighted DNS (pr-N).stage.example.com.

### EPIC-3: Observability Baseline
- [ ] OTEL-301: Propagate `traceparent` across gateway→service→DB spans.
- [ ] OTEL-302: Add RED metrics dashboards per service.
- [ ] OTEL-303: Burn-rate alerts (2×, 10×; 5m/1h windows).

### EPIC-4: Security & Compliance Gates
- [ ] SEC-401: Enforce SBOM attest & upload; block merge on criticals.
- [ ] SEC-402: Add gitleaks to CI + pre-commit.
- [ ] SEC-403: OPA policies: no `:latest`, require resources & probes.

### EPIC-5: DR & Resilience
- [ ] DR-501: Stage failover simulation (Route53 health check).
- [ ] DR-502: PITR verification with timestamped restores.

---

## 4) Scaffolds & Code Stubs

### 4.1 Helm canary overlay (`charts/app/values-canary.yaml`)
```yaml
# traffic steps with health gates
rollout:
  enabled: true
  steps:
    - setWeight: 10
    - pause: {duration: 2m}
    - setWeight: 30
    - pause: {duration: 5m}
    - setWeight: 60
    - pause: {duration: 10m}
  metrics:
    - name: error-rate
      interval: 1m
      failureLimit: 1
      provider: prometheus
      query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.02
    - name: latency-p95
      interval: 1m
      failureLimit: 1
      provider: prometheus
      query: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1.5
```

### 4.2 GitHub Actions: Preview Env per PR (`.github/workflows/preview.yml`)
```yaml
name: preview-env
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
jobs:
  preview:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - name: Helm lint
        run: helm lint charts/app
      - name: Deploy preview
        run: |
          NS=pr-${{ github.event.number }}
          kubectl create ns $NS --dry-run=client -o yaml | kubectl apply -f -
          helm upgrade --install app charts/app \
            --namespace $NS \
            -f charts/app/values.yaml \
            -f charts/app/values-preview.yaml \
            --set image.tag=${{ github.sha }}
  teardown:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: azure/setup-kubectl@v4
      - name: Destroy namespace
        run: kubectl delete ns pr-${{ github.event.number }} --ignore-not-found
```

### 4.3 Migration Gate Contract (`/ops/migrations/README.md`)
```md
# Migration Gate
- Migrations must be packaged as artifacts (SQL + checksum).
- CI verifies `--dry-run` against stage replica.
- Deploy job halts if migration gate artifact missing or checksum drift.
- Rollback plan required: `down.sql` or table-swap.
```

### 4.4 OPA Gatekeeper constraints (sample)
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredProbes
metadata: { name: require-probes }
spec:
  match: { kinds: [{ apiGroups: [""], kinds: ["Pod"] }] }
  parameters: { livenessProbe: true, readinessProbe: true }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: DisallowLatestTag
metadata: { name: disallow-latest }
spec:
  match: { kinds: [{ apiGroups: ["apps"], kinds: ["Deployment"] }] }
```

### 4.5 k6 perf smoke (thresholds on trends)
```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { thresholds: { http_req_duration: ['p(95)<1500'] } };
export default function() {
  const r = http.get(`${__ENV.BASE_URL}/health`);
  check(r, { 'status 200': (res) => res.status === 200 });
  sleep(1);
}
```

### 4.6 SBOM + image scan (CI snippet)
```yaml
- name: Build image
  run: docker build -t $REG/app:${{ github.sha }} .
- name: SBOM
  run: syft $REG/app:${{ github.sha }} -o spdx-json > sbom-${{ github.sha }}.json
- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with: { name: sbom, path: sbom-${{ github.sha }}.json }
- name: Trivy scan
  uses: aquasecurity/trivy-action@0.24.0
  with:
    image-ref: $REG/app:${{ github.sha }}
    vuln-type: 'os,library'
    severity: 'HIGH,CRITICAL'
    ignore-unfixed: true
```

---

## 5) Environment Promotions
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | CI green | Helm upgrade with canary=off | Smoke, unit in cluster | `helm rollback` |
| stage | Dev stable 24h | Canary 10→30→60→100 with metrics | SLO burn, traces linked, e2e | Auto-rollback on burn |
| prod | Stage stable 48h | Canary with guardrails | Golden signals + user path | Auto-rollback + feature flags |

---

## 6) Runbooks to Update
- **Deploy**: add canary & rollback steps, migration gate.
- **Incident**: SLO burn playbook → rollback + comms + observe.
- **DR**: failover steps with evidence capture.

---

## 7) Acceptance Evidence (to attach at close)
- Links to CI runs passing all gates for 3 top services.
- Grafana screenshots: p95, error-rate before/after canary.
- Audit log entries for deploy/rollback.
- DR drill timestamps (start, promote, recovery) proving RTO/RPO.

---

## 8) Calendar & Owners
- **Week 1**: CI unification, preview envs, OTEL injection.
- **Week 2**: Canary rollout, OPA constraints, DR drill, release cut.

Owner matrix: CODEOWNERS updated; no self-merge on critical paths.

---

## 9) Release Train (this sprint)
- **Cut**: 2025-10-09 (Thu)
- **Canary window**: 24–48h
- **Rollback**: Automated + manual override; migration backout documented
- **Notes**: user-visible changes, security updates, DR drill outcomes

---

## 10) Compliance Guardrails
- Immutable audit for who/what/why/when; require reason-for-access on prod data.
- DPIA template on changes touching PII; retention/purge policies verified.
- Dual-control deletes where applicable.

---

## 11) Quick Checklists
**Pre-Prod**
- [ ] Preview env green; all gates passed
- [ ] SLO burn = 0; alerts wired
- [ ] Canary+rollback documented; migration gate configured
- [ ] Audits enabled; reason-for-access prompts live
- [ ] Backups recent; RTO/RPO valid; last chaos drill ≤ 30 days

**Go/No-Go**
- [ ] Stage stable 48h
- [ ] No critical security findings
- [ ] Runbooks current; owners on-call

---

_End of sprint plan._
```

