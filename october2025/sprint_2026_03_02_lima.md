```markdown
---
slug: sprint-2026-03-02-lima
version: v2026.03.02-l1
cycle: Sprint 34 (2 weeks)
start_date: 2026-03-02
end_date: 2026-03-13
owner: Release Captain (you)
parent_slug: sprint-2026-02-16-kilo
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
  - "Production readiness tiering: gold/silver/bronze runbooks, SLOs, and escalation per service."
  - "Immutable delivery: image pinning by digest, provenance verification at admission, and rollback provenance links."
  - "Data residency & tenancy: region pinning, policy-enforced data paths, and residency-aware previews."
  - "Performance posture v3: tail latency (p99) controls, queue shedding, and cache stampede protection."
  - "DevX paved road v2: one-command scaffold → preview with guardrails, feature flag lifecycle automation."
  - "Cost efficiency v3: dynamic right-sizing (HPA+VPA), idle node pools scale-to-zero, and budget regression tests in CI."
---

# Sprint 34 Plan — Production Tiering, Immutable Delivery, and Residency Guardrails

Builds on Sprint 33 (outbox+CDC, FLE, multi-cloud registry, svc-template). This sprint establishes **service tiering**, enforces **immutable delivery with provenance**, implements **data residency** controls, hardens tail latency, and advances DevX & FinOps.

---

## 0) Definition of Ready (DoR)
- [ ] Service registry has ownership + tier (gold/silver/bronze) and on-call group.
- [ ] Admission policy keys for provenance verification available; registry supports digests.
- [ ] Residency matrix approved (data classes × regions) and routing rules drafted.
- [ ] p99 budgets defined per service; cache + queue strategies agreed.
- [ ] VPA in observe-only mode in stage; budget baselines captured.

---

## 1) Swimlanes

### A. Service Tiering & On-call (SRE)
1. **Tier catalog** with SLOs, alerts, paging policies, and RTO/RPO.
2. **Runbooks** templated by tier; gold services require chaos drills.

### B. Immutable Delivery & Provenance (CI/CD + Platform)
1. **Digest pinning** in Helm values; prohibit `:latest` and tag-only deploys.
2. **Admission verify**: provenance (SLSA) + cosign verify on deployment.
3. **Rollback provenance**: link prior digest + SBOM in release notes.

### C. Data Residency & Tenancy (Security/Data)
1. **Residency policy**: OPA/Conftest rules enforce region-specific storage/egress.
2. **Residency-aware previews**: PR envs route to region-compliant datasets.
3. **Audit**: egress logs include region + data class.

### D. Performance v3 (Platform/Backend)
1. **Tail latency**: queue shedding on saturation; cache stampede protection (singleflight).
2. **Async fallbacks** for expensive paths; p99 SLOs enforced.

### E. DevX v2 (CI/CD)
1. **Scaffold→Preview** unified `rc init && rc up` flow using `svc-template`.
2. **Feature flag lifecycle** automation: stale flag finder + PR to retire.

### F. FinOps v3 (Platform/FinOps)
1. **VPA right-sizing** (observe→enforce) + HPA integration.
2. **Idle node pools** scale-to-zero overnight/weekends where safe.
3. **Budget regression tests** as CI check (warn/fail on projected spend rise).

### G. Repo Arborist
- ADRs: residency policy and immutable delivery; CODEOWNERS for `policy/residency/**`.

---

## 2) Measurable Goals
- 100% services assigned a **tier** with runbooks and SLOs; gold services have chaos drill scheduled.
- 100% prod deployments pinned by **image digest**; admission verification enforced; 0 tag-only deploys.
- Residency policy denies non-compliant routes; previews use region-compliant data; **0** policy bypasses.
- p99 improves by **≥10%** on two key endpoints; stampede protection prevents thundering herd in test.
- `rc init && rc up` brings a new service to preview in **≤ 8m** with green checks.
- VPA suggestions applied to 3 workloads; cost report shows **≥10%** savings vs baseline.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Digest pinning breaks hotfix flow | M | M | Hotfix override with justification + audit | CI/CD |
| Residency policy blocks legitimate analytics | L | M | Explicit allowlisted pipelines with DPIA | Data |
| VPA oscillation | M | M | Stabilization windows + min/max guardrails | Platform |
| Tail latency gating causes elevated 429s | M | M | Per-tier thresholds; graceful degradation messaging | SRE |

---

## 4) Backlog (Sprint‑Scoped)

### EPIC‑TIER: Service Tiering
- [ ] TIER-6001 — Tier catalog (`service-catalog.yaml`) + owners/on-call
- [ ] TIER-6002 — Tiered runbook templates + generator

### EPIC‑IMM: Immutable Delivery
- [ ] IMM-6101 — Digest pinning across Helm charts
- [ ] IMM-6102 — Admission verify provenance + signature
- [ ] IMM-6103 — Rollback provenance links in release notes

### EPIC‑RES: Data Residency
- [ ] RES-6201 — OPA/Conftest rules for residency
- [ ] RES-6202 — Residency-aware preview routing + datasets
- [ ] RES-6203 — Egress audit with region + class

### EPIC‑P99: Tail Latency & Stampede
- [ ] P99-6301 — Queue shedding middleware + test
- [ ] P99-6302 — Singleflight cache layer
- [ ] P99-6303 — Async fallbacks for heavy endpoints

### EPIC‑DEVX2: Paved Road v2
- [ ] DEVX2-6401 — `rc` CLI (`init`,`up`) integration with template
- [ ] DEVX2-6402 — Flag retirement bot

### EPIC‑FIN3: FinOps v3
- [ ] FIN3-6501 — VPA observe→enforce on 3 workloads
- [ ] FIN3-6502 — Idle pools scale-to-zero
- [ ] FIN3-6503 — Budget regression CI check

---

## 5) Scaffolds & Snippets

### 5.1 Service Catalog (tiered)
**Path:** `service-catalog.yaml`
```yaml
services:
  gateway: { tier: gold, oncall: "#oncall-core", owner: "platform" }
  docs-api: { tier: gold, oncall: "#oncall-core", owner: "backend" }
  ingest: { tier: silver, oncall: "#oncall-core", owner: "backend" }
```

### 5.2 Helm Digest Pinning
**Path:** `charts/app/values.yaml`
```yaml
image:
  repository: ghcr.io/org/app
  digest: "sha256:abcdef..."
```
**Gatekeeper policy**
**Path:** `policy/require-digest.yaml`
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireImageDigest
metadata: { name: require-digest }
spec:
  match: { kinds: [{ apiGroups: ["apps"], kinds: ["Deployment"] }] }
```

### 5.3 Admission Verify Provenance (Kyverno)
**Path:** `policy/verify-provenance.yaml`
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: verify-provenance }
spec:
  validationFailureAction: Enforce
  rules:
  - name: require-provenance
    match: { resources: { kinds: [Deployment, StatefulSet] } }
    verifyImages:
    - image: "ghcr.io/org/*"
      attestations:
      - predicateType: https://slsa.dev/provenance/v1
```

### 5.4 Residency Policy (Rego)
**Path:** `policy/rego/residency.rego`
```rego
package residency

deny[msg] {
  input.request.region != allowed_region[input.request.data_class]
  msg := sprintf("Data class %v must stay in %v", [input.request.data_class, allowed_region[input.request.data_class]])
}
allowed_region := {"pii":"us-east-1","logs":"us-west-2"}
```

### 5.5 Residency‑Aware Preview (values overlay)
**Path:** `charts/preview/values-us-east.yaml`
```yaml
region: us-east-1
datasets:
  users: masked-us-east
  docs: masked-us-east
```

### 5.6 Queue Shedding & Singleflight (Node)
**Path:** `services/gateway/src/shedding.ts`
```ts
let inflight = 0; const MAX=Number(process.env.MAX_INFLIGHT||'200');
export function gate(req,res,next){ if(inflight>MAX) return res.status(429).set('Retry-After','1').end(); inflight++; res.on('finish',()=>inflight--); next(); }
```
**Singleflight**
**Path:** `services/docs-api/src/cache/singleflight.ts`
```ts
const inprog = new Map<string, Promise<any>>();
export async function once(key:string, fn:()=>Promise<any>){
  if(inprog.has(key)) return inprog.get(key)!;
  const p = fn().finally(()=>inprog.delete(key));
  inprog.set(key,p); return p;
}
```

### 5.7 Async Fallback (pattern)
**Path:** `services/docs-api/src/fallback.ts`
```ts
export async function maybeAsync(pathFn:()=>Promise<any>, enqueue:()=>Promise<string>){
  try { return await pathFn(); } catch(e){ const id = await enqueue(); return { status:'accepted', id }; }
}
```

### 5.8 `rc` CLI (proto)
**Path:** `tools/rc/index.js`
```js
#!/usr/bin/env node
import { execSync as x } from 'node:child_process';
const cmd = process.argv[2];
if(cmd==='init'){ x('plop service', { stdio:'inherit' }); }
if(cmd==='up'){ x('make preview PR=$PR', { stdio:'inherit' }); }
```

### 5.9 Flag Retirement Bot
**Path:** `.github/workflows/flag-retire.yml`
```yaml
name: flag-retire
on:
  schedule: [{ cron: '0 6 * * 1' }]
jobs:
  retire:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/flags/export.js | jq -r '.stale[]' | xargs -I{} gh issue create -t "chore(flag): retire {}" -b "Remove stale flag {}"
```

### 5.10 VPA + Idle Pool Scale-to-zero
**Path:** `charts/app/templates/vpa.yaml`
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata: { name: app-vpa }
spec:
  targetRef: { apiVersion: "apps/v1", kind: Deployment, name: app }
  updatePolicy: { updateMode: "Auto" }
```
**Idle pool (Terraform or K8s) sketch**
```hcl
# scale node group to zero on schedule (provider-specific)
```

### 5.11 Budget Regression Check (CI)
**Path:** `.github/workflows/budget-guard.yml`
```yaml
name: budget-guard
on: [pull_request]
jobs:
  estimate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/cost/estimate.js  # prints before/after; fails on >10% rise
```

---

## 6) Observability & Alerts
- **Dashboards**: service tiering health, digest-pinned deploys, provenance verifies, residency denials, p99 curves, shed rate & Retry-After, VPA actions, budget deltas.
- **Alerts**: tag-only deploy attempt (block), residency policy breach, p99 regression > 10%, shed rate > 2%, VPA thrash, budget guard fail.

---

## 7) Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Tier catalog merged; digest pinning in charts | Enforce non-tag deploys; residency rules dry-run | Clean deploys; no denials for dev | Disable policy flag |
| stage | Dev soak 24h; VPA observe | Enforce provenance verify; residency on | p99 meets budget; preview datasets routed | Relax rules to log-only |
| prod | Stage soak 48h; approvals | Enforce digest+provenance; VPA limited Auto | SLOs green; cost drop ≥10% | Disable admission rule; pin previous digest |

---

## 8) Acceptance Evidence
- Tier catalog + runbooks committed; chaos drill scheduled for gold services.
- Admission logs showing digest+provenance verification; 0 tag-only deploys.
- Residency policy test matrix; denials for misrouted requests captured.
- p99 improvement graphs; shed rate within limits; cache stampede test results.
- `rc init && rc up` demo: timestamps and green preview.
- VPA adoption diff + cost report showing ≥10% savings.

---

## 9) Calendar & Ownership
- **Week 1**: Tier catalog & runbooks, digest pinning + admission verify (dev), residency Rego, p99 controls, `rc` CLI glue.
- **Week 2**: Enforce in stage, VPA apply, budget guard, acceptance pack, release cut.

Release cut: **2026-03-13 (Fri)** with staged rollout + rollback plan.

---

## 10) Issue Seeds
- TIER-6001/6002, IMM-6101/6102/6103, RES-6201/6202/6203, P99-6301/6302/6303, DEVX2-6401/6402, FIN3-6501/6502/6503

---

_End of Sprint 34 plan._
```

