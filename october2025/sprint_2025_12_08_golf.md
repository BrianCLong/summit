```markdown
---
slug: sprint-2025-12-08-golf
version: v2025.12.08-g1
cycle: Sprint 29 (2 weeks)
start_date: 2025-12-08
end_date: 2025-12-19
owner: Release Captain (you)
parent_slug: sprint-2025-11-24-foxtrot
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
  - "Holiday change policy: freeze window with controlled exceptions, hotfix protocol, and audit evidence."
  - "Contract testing + backward compatibility gates (Pact/Buf) across gateway↔services."
  - "Year‑end compliance hardening: log retention/LTS archives, DPIA templates, dual‑control deletes enforcement."
  - "Scalability push: queue backlog protection, surge autoscaling, and async offload of heavy paths."
  - "Cost & performance: right‑size requests, sleep modes for idle jobs, and p95 ≤ 1.1s on top endpoints in stage."
---

# Sprint 29 Plan — Freeze Discipline, Compatibility Gates, and Year‑End Compliance

Assumes Sprints 24–28 landed (progressive delivery, SLSA+cosign, OPA bundles, multi‑region, Blue/Green, WAF, rotations). This sprint institutes a **holiday freeze** with safe hotfix channels, adds **contract testing** to prevent breaking changes, and closes out **compliance & cost** goals for year‑end.

---

## 0) Definition of Ready (DoR)
- [ ] Change freeze calendar approved (dates, owners, exceptions) and published.
- [ ] All service APIs have a declared version and schema (OpenAPI/Protobuf) with owners.
- [ ] Retention rules and LTS archive targets defined; DPIA template bound to data flows.
- [ ] Surge test profile and target RPS agreed for stage.

---

## 1) Swimlanes

### A. Change Policy & Hotfix Channel (Release/Deploy)
1. **Freeze window**: non‑critical merges blocked; hotfix path with Release Captain approval.
2. **Exception workflow**: issue template + on‑call sign‑off; automated post‑facto audit drop.

### B. Contract Testing & Compatibility (CI/CD)
1. **Pact/Buf** contract tests between gateway↔services; **breaking change detector** gate.
2. **Versioning policy**: semver for APIs; deprecation flags; rollout announcements.

### C. Compliance & Data Lifecycle (Security/Data)
1. **Log retention & LTS**: hot logs → 30d; warm → 90d; archive to object‑lock for 365d.
2. **DPIA templates** wired in PRs that touch PII; evidence uploaded to audit bucket.
3. **Dual‑control deletes** enforced at API layer with approvals and audit linkage.

### D. Scalability & Reliability (Platform)
1. **Queue backpressure**: rate‑limit producers, dead‑letter metrics & alarms.
2. **Surge autoscaling**: HPA signals on custom queue depth metric; stabilization windows set.
3. **Async offload**: move heavy sync endpoints to async jobs with polling/webhooks.

### E. FinOps & Perf (FinOps/Obs)
1. **Sleep/cron downshift** for idle workers; node pool scale‑to‑zero where safe.
2. **Perf profiling** to hit p95 ≤ 1.1s on `/search`, `/docs/:id`, `/ingest` in stage.

### F. Repo Arborist
- CODEOWNERS update for API specs; ADRs for contract policy & freeze policy.

---

## 2) Measurable Goals
- Freeze in effect from **2025‑12‑20 → 2026‑01‑03** with documented hotfixes only.
- 100% services participating in contract tests; **0** breaking changes merged.
- Log retention & archive policies live; **evidence** of object‑lock and restore test captured.
- Surge test: **no SLO breach** at 2× baseline RPS; queue depth < threshold for 95% of test.
- Stage p95 ≤ **1.1s** on target endpoints.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Hotfix bypasses gates | L | H | Separate hotfix pipeline with minimal but strict gates + approvals | Release |
| Contract tests flaky | M | M | Provider states, seed data fixtures, quarantine lane | CI/CD |
| Archive cost spike | L | M | Glacier Deep Archive tier + lifecycle policies | Data |
| Async offload introduces UX lag | M | M | Webhooks + polling w/ progress; user messaging | Platform |

---

## 4) Backlog (Sprint‑Scoped)

### EPIC-FRZ: Freeze & Hotfix
- [ ] FRZ-2001 — Freeze policy files + CI enforcement
- [ ] FRZ-2002 — Hotfix pipeline with minimal gates & rollback
- [ ] FRZ-2003 — Exception template + audit evidence upload

### EPIC-API: Contract Testing
- [ ] API-2051 — Pact setup gateway↔docs-api, gateway↔ingest
- [ ] API-2052 — Breaking change detector in CI (OpenAPI/Buf)
- [ ] API-2053 — API versioning policy & deprecation flags

### EPIC-COMP: Compliance
- [ ] COMP-2101 — Log retention & archive buckets + object‑lock
- [ ] COMP-2102 — DPIA PR template hook + audit sink
- [ ] COMP-2103 — Dual‑control delete service + UI prompts

### EPIC-SCALE: Scalability
- [ ] SCALE-2151 — Queue depth metric & HPA integration
- [ ] SCALE-2152 — Producer rate limits + DLQ alarms
- [ ] SCALE-2153 — Async offload for heavy endpoint(s)

### EPIC-FP: FinOps/Perf
- [ ] FP-2201 — Sleep mode for idle workers & node pools
- [ ] FP-2202 — Profiling and fixes to reach 1.1s p95

### EPIC-GOV: Governance
- [ ] GOV-2251 — ADRs for freeze & contracts; CODEOWNERS for specs

---

## 5) Scaffolds & Snippets

### 5.1 Freeze Enforcement (CI)
**Path:** `.github/workflows/freeze.yml`
```yaml
name: freeze-window
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Enforce freeze
        run: |
          START=2025-12-20T00:00:00Z
          END=2026-01-03T23:59:59Z
          NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
          if [[ "$NOW" > "$START" && "$NOW" < "$END" ]]; then
            echo "\n⚠️ Freeze window active. Only hotfix-labelled PRs allowed.";
            echo "::group::Freeze details"; echo "Exceptions require 'hotfix' label and approval by Release Captain"; echo "::endgroup::";
            if ! gh pr view ${{ github.event.pull_request.number }} --json labels | jq -e '.labels[].name=="hotfix"' >/dev/null; then
              echo "Not a hotfix. Failing."; exit 1; fi
          fi
```

### 5.2 Hotfix Pipeline (minimal gates)
**Path:** `.github/workflows/hotfix.yml`
```yaml
name: hotfix
on:
  workflow_dispatch:
  push:
    branches: [hotfix/*]
permissions:
  contents: read
  id-token: write
  packages: write
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm i --frozen-lockfile
      - run: pnpm test -w  # smoke subset
      - name: SAST/SCA minimal
        run: echo "run scanners with high/critical only"
  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - name: Canary deploy
        run: echo "helm upgrade --install ... with canary steps"
```

### 5.3 Pact Setup (consumer/provider)
**Path:** `tests/pact/gateway-docs-api.spec.ts`
```ts
import { PactV3 } from '@pact-foundation/pact';
const pact = new PactV3({ consumer: 'gateway', provider: 'docs-api' });
// define interactions...
```
**Path:** `.github/workflows/contracts.yml`
```yaml
name: contracts
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm i
      - run: pnpm test:contracts
```

### 5.4 OpenAPI/Buf Breaking Change Gate
**Path:** `.github/workflows/api-breakage.yml`
```yaml
name: api-breakage
on: [pull_request]
jobs:
  openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx openapi-diff -f swagger -o ./.openapi-diff.json old.yaml new.yaml || true
      - run: jq -e '.breakingChanges|length==0' ./.openapi-diff.json
```

### 5.5 Log Retention & Archive (Terraform)
**Path:** `infra/aws/logs/lifecycle.tf`
```hcl
resource "aws_s3_bucket" "logs_hot" { bucket = var.logs_hot }
resource "aws_s3_bucket_lifecycle_configuration" "logs_hot" {
  bucket = aws_s3_bucket.logs_hot.id
  rule {
    id = "hot-to-warm"
    filter { prefix = "" }
    transition { days = 30 storage_class = "STANDARD_IA" }
    transition { days = 90 storage_class = "GLACIER" }
    expiration { days = 365 }
  }
}
resource "aws_s3_bucket_object_lock_configuration" "archive" {
  bucket = aws_s3_bucket.logs_hot.id
  rule { default_retention { mode = "GOVERNANCE" days = 365 } }
}
```

### 5.6 DPIA PR Template Hook
**Path:** `.github/pull_request_template.md` (append)
```md
## DPIA
- [ ] Touches personal data? If yes, attach DPIA form link and mitigation summary.
```

### 5.7 Dual‑Control Deletes (API Sketch)
**Path:** `services/docs-api/src/deletes.ts`
```ts
export async function requestDelete(resourceId:string, reason:string){
  // create pending delete with reason and requester
}
export async function approveDelete(requestId:string){
  // second approver confirms; delete executes; audit written
}
```

### 5.8 Queue Depth Metric & HPA
**Path:** `charts/worker/templates/metrics.yaml`
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: worker-queue }
spec:
  selector: { matchLabels: { app: worker } }
  endpoints: [{ port: metrics, interval: 15s }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: worker-hpa }
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric: { name: queue_depth }
      target: { type: AverageValue, averageValue: "100" }
  behavior:
    scaleUp: { stabilizationWindowSeconds: 180 }
    scaleDown: { stabilizationWindowSeconds: 300 }
```

### 5.9 Producer Rate Limits & DLQ Alarm
**Path:** `charts/gateway/templates/ratelimit-producer.yaml`
```yaml
# example: token bucket limiter on outbound produce calls
```

### 5.10 Sleep/Downshift for Idle Workers
**Path:** `.github/workflows/downshift.yml`
```yaml
name: downshift
on:
  schedule: [{ cron: '0 3 * * *' }]
jobs:
  scale:
    runs-on: ubuntu-latest
    steps:
      - name: Scale idle workers to zero in stage
        run: kubectl -n stage scale deploy worker --replicas=0
```

---

## 6) Observability & Alerts
- **Dashboards**: freeze activity, hotfix releases, contract pass/fail, queue depth vs RPS, DLQ rate, p95 trend.
- **Alerts**: breaking change detected (fail PR), queue depth breach, DLQ spike, archive write errors.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Contract tests wired; freeze CI in place | Run surge test; enable HPA on queue depth | No throttling; p95 stable | Disable HPA; reduce RPS |
| stage | Archive bucket ready; DPIA hook live | Async offload for 1 endpoint; retention policies applied | RED stable; restore test passes | Revert flag; re-route sync path |
| prod | Freeze starts 2025‑12‑20; approvals | Hotfix path only; contracts enforced | 0 breaking changes; audits present | Stop hotfix; rollback release |

---

## 8) Acceptance Evidence
- CI logs showing freeze enforcement and hotfix labels on merged PRs.
- Contract test reports + API diff showing 0 breaking changes.
- Archive bucket lifecycle JSON + restore test screenshot/logs.
- Surge test dashboards: RPS vs queue depth, DLQ < threshold.
- Stage p95 ≤ 1.1s graphs.

---

## 9) Calendar & Ownership
- **Week 1**: Freeze policy+CI; contracts (Pact/Buf); retention+archive; queue metrics; surge profile.
- **Week 2**: Async offload; HPA tuning; DPIA hook; performance fixes; release cut.

Release cut: **2025-12-19 (Fri)**; freeze window immediately after (hotfix‑only).

---

## 10) Issue Seeds
- FRZ-2001/2002/2003, API-2051/2052/2053, COMP-2101/2102/2103, SCALE-2151/2152/2153, FP-2201/2202, GOV-2251

---

_End of Sprint 29 plan._
```

