````markdown
---
slug: sprint-2026-01-19-india
version: v2026.01.19-i1
cycle: Sprint 31 (2 weeks)
start_date: 2026-01-19
end_date: 2026-01-30
owner: Release Captain (you)
parent_slug: sprint-2026-01-05-hotel
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - FinOps Lead
  - Repo Maintainer / Arborist
objectives:
  - 'Zero-trust runtime: service-to-service mTLS with SPIFFE/SPIRE; mesh canary on gateway→docs-api path.'
  - 'Data-privacy by default in previews: Test Data Management (TDM) with masking/synthesis and access logging.'
  - 'Performance budgets enforced in CI (latency/error/cpu/mem) with automatic regress guard.'
  - 'Incident automation: runbook-as-code checks + PagerDuty/Jira hooks; MTTA ≤ 5m in stage drills.'
  - 'Cost & efficiency: autoscaling polish, idle scale-to-zero, and build cache hit ≥ 85%.'
  - 'Governance: Terraform/Helm policy-as-code via Conftest/OPA with versioned bundle + audit.'
---

# Sprint 31 Plan — Zero‑Trust Mesh, Privacy‑Safe Previews, and Budget Guards

Builds on Sprint 30 upgrades and SLO reset. We introduce **mTLS + SPIFFE IDs** for workload identity, harden **preview environments** with masked datasets, add **performance budgets in CI**, and automate incident primitives.

---

## 0) Definition of Ready (DoR)

- [ ] Mesh choice and scope agreed (Linkerd/Istio). Start with **gateway→docs-api** canary.
- [ ] Data masking rules approved for PII fields; synthetic generators reviewed.
- [ ] Performance budgets defined per service (p95, error, CPU%, RSS MB) with owners.
- [ ] Incident drill calendar and channels confirmed.
- [ ] Policy bundle repo exists with Conftest tests wired for Terraform/Helm.

---

## 1) Swimlanes

### A. Zero-Trust Mesh (Platform/Deploy)

1. **SPIRE** server/agent deploy; SPIFFE IDs `spiffe://org/env/ns/sa`.
2. **mTLS** enforced for gateway↔docs-api; gradual canary; authz via mesh policy.
3. **Sidecar rollout** plan & overhead monitoring; tune resource requests/limits.

### B. Privacy-Safe Previews (Data/Platform)

1. **TDM pipeline**: masked/synth data for Postgres; job per PR namespace.
2. **Access logging**: preview DB access captured + linked to PR.
3. **Lease/TTL** controls hardened; teardown guarantees.

### C. Performance Budgets (CI/CD + Obs)

1. **k6 budgets** per endpoint; **fail PR** on regression beyond threshold.
2. **CPU/RSS budgets** from container stats in e2e; publish trend.
3. **Perf triage** labeler + quarantine lane for noisy changes.

### D. Incident Automation (SRE)

1. **Runbook-as-code** checks (`tools/runbook-checks`) run after deploy.
2. **Pager/Jira hooks**: auto-create incident + on-call page on SLO burn.
3. **Drills**: two staged incidents (dependency brownout, cache outage).

### E. FinOps & Build Efficiency (CI/CD + Platform)

1. **Layer cache registry** for Docker builds; cache warming.
2. **Scale-to-zero** for idle jobs via KEDA/cron.
3. **Autoscaling polish**: HPAs on custom metrics with stabilization.

### F. Governance (Security/Arborist)

1. **Conftest** policies for Terraform/Helm; bundle signed & versioned.
2. **Admission checks** ensure image signatures + vuln threshold.

---

## 2) Measurable Goals

- mTLS active for **gateway↔docs-api** with SPIFFE IDs; no p95 degradation > 5%.
- 100% preview DBs seeded via TDM; **0** raw PII exposure; access logs per PR.
- CI **perf budgets** enabled on top 3 endpoints; regression PRs fail with clear diff.
- Incident drills: MTTA ≤ 5m; MTTR ≤ 20m in stage.
- Build cache hit rate **≥ 85%**; image build time reduced ≥ 25% on median.
- Conftest policies gate all Terraform/Helm plans; bundle signature recorded in audit.

---

## 3) Risk Register

| Risk                               | Prob | Impact | Mitigation                                            | Owner    |
| ---------------------------------- | ---: | -----: | ----------------------------------------------------- | -------- |
| Sidecar overhead increases latency |    M |      M | Scope small; tune resources; monitor p95; bypass flag | Platform |
| Masking breaks tests               |    M |      M | Provide synthetic generators; golden datasets         | Data     |
| Budget gates create noise          |    M |      L | Warm-up, trend-based budgets, quarantine lane         | CI/CD    |
| Incident hooks page too often      |    M |      M | Burn-rate windows, cooldowns, drill silences          | SRE      |

---

## 4) Backlog (Sprint‑Scoped)

### EPIC-ZT: Zero‑Trust Mesh

- [ ] ZT-3601 — SPIRE server/agent deploy (dev/stage)
- [ ] ZT-3602 — SPIFFE ID issuance & docs
- [ ] ZT-3603 — mTLS canary gateway↔docs-api + authz policy

### EPIC-TDM: Privacy‑Safe Previews

- [ ] TDM-3701 — Masking rules catalog + generator (Postgres)
- [ ] TDM-3702 — PR namespace seeding Job + access logging
- [ ] TDM-3703 — TTL/lease enforcement + teardown checks

### EPIC-PB: Performance Budgets

- [ ] PB-3801 — k6 thresholds per endpoint; CI action
- [ ] PB-3802 — CPU/RSS capture in e2e; trend charts
- [ ] PB-3803 — Quarantine lane + labeler for perf regressions

### EPIC-INC: Incident Automation

- [ ] INC-3901 — Runbook-as-code checks after deploy
- [ ] INC-3902 — Pager/Jira hooks on SLO burn
- [ ] INC-3903 — Stage drills (brownout + cache outage)

### EPIC-FIN: Efficiency

- [ ] FIN-4001 — Build layer cache registry + warming
- [ ] FIN-4002 — KEDA/cron scale-to-zero for idle jobs
- [ ] FIN-4003 — HPA polish with custom metrics

### EPIC-GOV: Policy‑as‑Code

- [ ] GOV-4101 — Conftest policies for Terraform/Helm
- [ ] GOV-4102 — Signed bundle + admission checks

---

## 5) Scaffolds & Snippets

### 5.1 SPIRE Registration (example)

**Path:** `mesh/spire/registration.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
SPIRE_SERVER=${SPIRE_SERVER:-spire-server.spire}
# gateway SA in ns prod
kubectl exec -n spire deploy/spire-server -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://org/prod/gateway \
  -parentID spiffe://org/node/agent \
  -selector k8s:ns:prod -selector k8s:sa:gateway
kubectl exec -n spire deploy/spire-server -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://org/prod/docs-api \
  -parentID spiffe://org/node/agent \
  -selector k8s:ns:prod -selector k8s:sa:docs-api
```
````

### 5.2 Istio PeerAuth/DestinationRule/AuthZ (canary scope)

**Path:** `mesh/istio/gateway-docs-api.yaml`

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata: { name: mesh-mtls, namespace: prod }
spec: { mtls: { mode: STRICT } }
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata: { name: docs-api-dr, namespace: prod }
spec:
  host: docs-api.prod.svc.cluster.local
  trafficPolicy:
    tls: { mode: ISTIO_MUTUAL }
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata: { name: docs-api-allow-gateway, namespace: prod }
spec:
  selector: { matchLabels: { app: docs-api } }
  rules:
    - from:
        - source:
            principals: ['spiffe://org/prod/gateway']
```

### 5.3 Preview TDM Seeder (Job)

**Path:** `charts/preview/templates/tdm-seed.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: tdm-seed }
spec:
  template:
    spec:
      containers:
        - name: seed
          image: ghcr.io/your-org/tdm:latest
          env:
            - {
                name: DATABASE_URL,
                valueFrom: { secretKeyRef: { name: db, key: url } },
              }
            - { name: MASK_RULES, value: '/rules/mask.yaml' }
          volumeMounts: [{ name: rules, mountPath: /rules }]
      restartPolicy: OnFailure
      volumes:
        - name: rules
          configMap: { name: tdm-rules }
```

**Masking rules**
**Path:** `charts/preview/templates/tdm-rules.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: tdm-rules }
data:
  mask.yaml: |
    users.email: faker.email
    users.phone: faker.phone
    documents.text: redact
```

### 5.4 Access Logging for Preview DB

**Path:** `ops/preview/access-log.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pgaudit;
ALTER SYSTEM SET pgaudit.log = 'read, write';
SELECT pg_reload_conf();
```

### 5.5 k6 Budget CI (per endpoint)

**Path:** `.github/workflows/perf-budgets.yml`

```yaml
name: perf-budgets
on: [pull_request]
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 budgets
        run: |
          k6 run tests/k6/budgets.js --vus 5 --duration 1m
```

**Path:** `tests/k6/budgets.js`

```js
import http from 'k6/http';
import { check } from 'k6';
export const options = {
  thresholds: {
    'http_req_duration{endpoint:/search}': ['p(95)<1200'],
    'http_req_duration{endpoint:/docs/:id}': ['p(95)<1200'],
    http_req_failed: ['rate<0.02'],
  },
};
export default function () {
  const s = http.get(`${__ENV.BASE_URL}/search?q=ok`, {
    tags: { endpoint: '/search' },
  });
  check(s, { 'search 200': (r) => r.status === 200 });
}
```

### 5.6 CPU/RSS Budgets Capture

**Path:** `tools/collect-container-metrics.sh`

```bash
#!/usr/bin/env bash
kubectl top pods -n pr-$PR -o json > metrics.json
# parse and compare against budgets
```

### 5.7 Runbook-as-Code Checks

**Path:** `tools/runbook-checks/checks.yml`

```yaml
checks:
  - name: health-endpoints
    command: curl -sf $BASE/health
  - name: audit-stream
    command: test -n "$(curl -s $OBS/audit/last)"
```

**CI hook**
**Path:** `.github/workflows/runbook-checks.yml`

```yaml
name: runbook-checks
on: [workflow_run]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: tools/runbook-checks/run.sh
```

### 5.8 Conftest Policies (Terraform/Helm)

**Path:** `policy/conftest/terraform.rego`

```rego
package terraform

deny[msg] {
  input.resource.type == "aws_s3_bucket"
  not input.resource.versioning.enabled
  msg := sprintf("Buckets must enable versioning: %v", [input.resource.name])
}
```

**Path:** `.github/workflows/policy.yml`

```yaml
name: policy-gate
on: [pull_request]
jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: instrumenta/conftest-action@v0.3.0
        with: { files: 'infra/**.tf, charts/**/values.yaml' }
```

### 5.9 KEDA Scale-to-Zero (example)

**Path:** `charts/worker/templates/keda.yaml`

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: worker-scaler }
spec:
  scaleTargetRef: { name: worker }
  pollingInterval: 30
  cooldownPeriod: 300
  minReplicaCount: 0
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: queue_depth
        threshold: '10'
        query: sum(queue_depth)
```

### 5.10 Autoscaling Polish (HPA behavior)

**Path:** `charts/app/templates/hpa.yaml` (excerpt)

```yaml
spec:
  behavior:
    scaleUp: { stabilizationWindowSeconds: 300 }
    scaleDown: { stabilizationWindowSeconds: 600 }
```

---

## 6) Observability & Alerts

- **Dashboards**: mTLS success/handshake errors, preview seed status, perf budget trend, build cache hit %, MTTA/MTTR, Conftest passes/denies.
- **Alerts**: TLS handshake failure spike, preview seed failure, perf budget regression, cache hit < 70%, policy gate bypass attempt.

---

## 7) Promotions & Gates

| Stage | Preconditions              | Action                                              | Verification                                | Rollback                                |
| ----- | -------------------------- | --------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| dev   | SPIRE up; TDM rules loaded | Enable mTLS for gateway→docs-api                    | p95 stable; traces include `peer.spiffe_id` | Disable PeerAuth; fallback to plaintext |
| stage | Dev soak 24h               | CI perf budgets on; drills scheduled                | Budgets pass; MTTA/MTTR achieved            | Relax budgets; disable hooks            |
| prod  | Stage soak 48h; approvals  | Rollout mTLS subset; TDM "+ access log" on previews | SLO green; audits recorded                  | Disable mTLS; revert preview seed       |

---

## 8) Acceptance Evidence

- Mesh graphs & TLS stats; before/after p95 for target path.
- Preview seed job logs; pgaudit samples; zero PII exposure proofs.
- CI runs showing budget gating; perf regress PR blocked.
- Drill timeline with MTTA/MTTR; Pager/Jira artifacts.
- Build cache metrics report showing ≥85% hits.
- Conftest report with signed bundle hash in audit log.

---

## 9) Calendar & Ownership

- **Week 1**: SPIRE/mesh canary, TDM rules + seeder, conftest gate, cache registry.
- **Week 2**: CI perf budgets, drills, KEDA scale-to-zero, HPA polish, release cut.

Release cut: **2026-01-30 (Fri)** with canary 24–48h and rollback path.

---

## 10) Issue Seeds

- ZT-3601/3602/3603, TDM-3701/3702/3703, PB-3801/3802/3803, INC-3901/3902/3903, FIN-4001/4002/4003, GOV-4101/4102

---

_End of Sprint 31 plan._

```

```
