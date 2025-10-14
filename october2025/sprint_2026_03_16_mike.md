```markdown
---
slug: sprint-2026-03-16-mike
version: v2026.03.16-m1
cycle: Sprint 35 (2 weeks)
start_date: 2026-03-16
end_date: 2026-03-27
owner: Release Captain (you)
parent_slug: sprint-2026-03-02-lima
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
  - "Runtime policy maturity: fine-grained ABAC with service/tenant attributes and break-glass with immutable audit."
  - "Release train automation: cut, notes, provenance links, and rollback rehearsal as part of the pipeline."
  - "Data contracts & schema registry: producer/consumer contracts with backward/forward compatibility gates."
  - "Performance posture v4: coordinated cache layers (edge/app/db), negative cache & TTL hygiene; p99.9 protections."
  - "Network resilience: fault injection (latency/packet loss) game days and adaptive timeouts at client libraries."
  - "FinOps guardrail v4: workload efficiency scorecards, weekly budget deltas, and waste hunters (orphaned volumes/IPs)."
---

# Sprint 35 Plan — Policy Precision, Release Automation, and p99.9 Resilience

Builds on Sprint 34 (tiering, immutable delivery, residency). This sprint tightens **access policy**, automates the **release train**, formalizes **data contracts**, hardens **tail-of-tail latency**, injects **network faults**, and raises **cost guardrails**.

---

## 0) Definition of Ready (DoR)
- [ ] Attribute model for ABAC defined (service, tenant, data_class, environment, region).
- [ ] Release train checklist codified with rehearsal job and rollback play.
- [ ] Data contract formats selected (OpenAPI + JSON Schema / Protobuf) and registry path chosen.
- [ ] Cache policy matrix approved (what/where/TTL/invalidations) and negative-cache rules.
- [ ] Fault injection windows scheduled; safety flags & blast radius defined.
- [ ] FinOps scorecard baselines captured.

---

## 1) Swimlanes

### A. ABAC & Break-Glass (Security/Governance)
1. **OPA/Rego**: decisions based on `attrs.*` (service/tenant/data_class/region).
2. **Break-glass flow**: step-up auth + reason-for-access; immutable audit; TTL on access.
3. **Policy bundle** promotion with staged rollout and decision log dashboards.

### B. Release Train Automation (CI/CD/Release)
1. **Pipeline step** to cut release, attach SBOM/provenance, and publish notes.
2. **Rollback rehearsal** job on stage with evidence capture.
3. **Changelog bot** groups by area; links digests and policies enforced.

### C. Data Contracts & Registry (Platform/Data)
1. **Schema registry** (git-backed or registry) with versioning and approvals.
2. **CI gates** for backward/forward compatibility.
3. **Contract drift detector** and consumer impact report.

### D. Performance v4 (Platform/Backend)
1. **Coordinated caching**: edge/app/db; **negative cache** for common 4xx; TTL discipline.
2. **p99.9** watch: adaptive concurrency & queueing at gateway.

### E. Network Resilience (SRE)
1. **Fault injection** (latency/loss) via mesh/chaos tools; client adaptive timeouts.
2. **Brownout patterns** for heavy dependencies.

### F. FinOps v4 (FinOps/Platform)
1. **Efficiency scorecards** per service (CPU/mem/utilization/requests).
2. **Waste hunters**: orphaned volumes/IPs/load balancers scrubber.
3. **Weekly budget delta** with PR comment if over threshold.

### G. Repo Arborist
- ADRs for ABAC, release automation, and cache policy; CODEOWNERS for contracts.

---

## 2) Measurable Goals
- 100% privileged actions protected by **break-glass** with audit and TTL.
- Release train pipeline produces notes with **digests + SBOM + provenance** every cut; **rollback rehearsal** runs green.
- 100% producer endpoints and 2 consumers under **contract gates** (no breaking changes merged).
- p99.9 improved **≥ 10%** on `GET /docs/:id` and `GET /search`; cache hit ratio +10% with correct TTLs.
- Fault injection drills completed; **no pager** events; clients adapt timeouts without error spikes.
- Efficiency scorecards published; **≥ 8%** resource savings via right-sizing and waste cleanup.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Overly strict ABAC blocks valid ops | M | M | Dry-run, staged rollout, break-glass | Security |
| Release automation mis-tags images | L | M | Digest pinning + provenance verify before cut | CI/CD |
| Contract gates noisy | M | L | Golden datasets, provider states, allowlist during bootstrap | Data |
| Cache negative entries too sticky | M | M | Short TTL, success invalidation | Platform |
| Fault injection bleeds into prod | L | H | Mesh labels + deny prod namespace | SRE |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-ABAC: Attribute-based Access
- [ ] ABAC-7001 — Attribute model + context injectors
- [ ] ABAC-7002 — Rego policies + break-glass workflow
- [ ] ABAC-7003 — Decision log dashboards + alerts

### EPIC-REL: Release Train Automation
- [ ] REL-7101 — Cut/release job with SBOM/provenance
- [ ] REL-7102 — Rollback rehearsal job (stage)
- [ ] REL-7103 — Changelog bot by area with digests

### EPIC-CON: Data Contracts
- [ ] CON-7201 — Schema registry bootstrap
- [ ] CON-7202 — Backward/forward gates
- [ ] CON-7203 — Drift detector + consumer impact report

### EPIC-PERF4: p99.9 & Caching
- [ ] PERF4-7301 — Edge/app/db cache policy & negative cache
- [ ] PERF4-7302 — Adaptive concurrency/queue at gateway

### EPIC-NET: Fault Injection & Timeouts
- [ ] NET-7401 — Mesh fault injection manifests
- [ ] NET-7402 — Client adaptive timeout library

### EPIC-FIN4: Efficiency & Waste
- [ ] FIN4-7501 — Efficiency scorecards per service
- [ ] FIN4-7502 — Orphaned resources scrubber
- [ ] FIN4-7503 — Weekly budget delta comment bot

---

## 5) Scaffolds & Snippets

### 5.1 Rego ABAC (sketch)
**Path:** `policy/rego/abac.rego`
```rego
package abac
allow {
  input.attrs.role == "admin"
}
allow {
  input.attrs.service == "gateway"
  input.attrs.tenant == input.request.tenant
  input.attrs.data_class == input.request.data_class
}
```

### 5.2 Break-Glass Lambda/Worker (audit TTL)
**Path:** `services/access/breakglass.ts`
```ts
export async function grantTemporary(role:string, subject:string, minutes=30){
  const until = new Date(Date.now()+minutes*60000).toISOString();
  await audit.write({ type:'breakglass', subject, role, until });
  await policy.addTempRole(subject, role, until);
}
```

### 5.3 Release Train Job
**Path:** `.github/workflows/release-train.yml`
```yaml
name: release-train
on:
  workflow_dispatch:
  schedule: [{ cron: '0 18 * * 4' }]
jobs:
  cut:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify digests & provenance
        run: echo "cosign verify --certificate-oidc-issuer ..."
      - name: Generate notes
        run: tools/release-notes.sh
      - name: Attach SBOM
        run: echo "upload sboms"
```

### 5.4 Contract Gate (JSON Schema / OpenAPI)
**Path:** `.github/workflows/contract-gate.yml`
```yaml
name: contract-gate
on: [pull_request]
jobs:
  openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx openapi-diff old.yaml new.yaml --fail-on-changed-response-schema
```

### 5.5 Cache Policy Matrix
**Path:** `docs/cache-policy.md`
```md
| Layer | Path | TTL | Negative TTL | Invalidation |
| edge | /docs/:id | 300s | 30s | purge on update |
| app  | search results | 60s | 10s | on index refresh |
```

### 5.6 Adaptive Concurrency (gateway)
**Path:** `services/gateway/src/adaptive.ts`
```ts
let max = Number(process.env.MAX_INFLIGHT||'200');
export function adapt(samples:number[]){
  const p99 = samples[Math.floor(samples.length*0.99)];
  if(p99 > 1500 && max>50) max -= 10; else if(p99 < 800) max += 10;
  return max;
}
```

### 5.7 Mesh Fault Injection (Istio)
**Path:** `mesh/istio/faults.yaml`
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata: { name: docs-api-fault }
spec:
  hosts: ["docs-api"]
  http:
  - fault: { delay: { fixedDelay: 800ms, percentage: { value: 30 } }, abort: { httpStatus: 503, percentage: { value: 1 } } }
    route: [{ destination: { host: docs-api }}]
```

### 5.8 Efficiency Scorecard (collector)
**Path:** `tools/efficiency/scorecard.js`
```js
// Gather CPU/mem request vs usage from Prom/metrics-server and emit per-service score
```

### 5.9 Orphaned Resource Scrubber
**Path:** `tools/cleanup/orphans.sh`
```bash
#!/usr/bin/env bash
# find & optionally delete unattached volumes, idle IPs, unused LBs; dry-run first
```

### 5.10 Budget Delta Comment Bot
**Path:** `.github/workflows/budget-delta.yml`
```yaml
name: budget-delta
on:
  schedule: [{ cron: '0 12 * * 1' }]
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - run: node tools/cost/delta.js | gh pr comment $(gh pr list -L1 -q '.[0].number') -b -
```

---

## 6) Observability & Alerts
- **Dashboards**: ABAC decisions (allow/deny), break-glass events, release train outcomes, contract gate passes/fails, p99.9 trends, adaptive inflight limits, fault injection results, efficiency scores, budget deltas.
- **Alerts**: policy deny spike, break-glass TTL expired still active, release train failure, contract gate fail, p99.9 regression, fault injection leaking, waste hunter found spikes.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | ABAC dry-run; registry primed | Enable break-glass; contract gates on | No noisy denials; CI passes | Disable policy; bypass gate |
| stage | Dev soak 24h | Release rehearsal; fault injection window | Notes produced; no pager; p99.9 controlled | Revert faults; rollback |
| prod | Stage soak 48h; approvals | Enforce ABAC; automate release; cache policy live | SLOs green; audits captured | Disable ABAC; previous cache TTLs |

---

## 8) Acceptance Evidence
- Decision log dashboards; break-glass audit entries with TTL.
- Release cut artifacts: notes, SBOM, provenance, digests; rollback rehearsal logs.
- Contract registry entries with diff reports; CI runs showing gates.
- p99.9 graphs and cache hit ratios before/after.
- Fault injection results with no user-visible errors; adaptive limits logs.
- Efficiency scorecards and waste cleanup diffs; budget delta report.

---

## 9) Calendar & Ownership
- **Week 1**: ABAC model + break-glass, release train job, schema registry bootstrap, cache matrix, fault injection plan, scorecard baseline.
- **Week 2**: Stage rehearsal & faults, contract gates, adaptive concurrency rollout, waste hunter & budget bot, release cut.

Release cut: **2026-03-27 (Fri)** with staged rollout + rollback plan.

---

## 10) Issue Seeds
- ABAC-7001/7002/7003, REL-7101/7102/7103, CON-7201/7202/7203, PERF4-7301/7302, NET-7401/7402, FIN4-7501/7502/7503

---

_End of Sprint 35 plan._
```

