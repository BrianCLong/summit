```markdown
---
slug: sprint-2025-10-13-charlie
version: v2025.10.13-c1
cycle: Sprint 25 (2 weeks)
start_date: 2025-10-13
end_date: 2025-10-24
owner: Release Captain (you)
parent_slug: sprint-2025-09-29-bravo
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Repo Maintainer / Arborist
  - Merge & Release Captain
objectives:
  - "Zero-downtime schema migrations with guarded rollout + online backfill."
  - "SLSA provenance + signed images (cosign) for all deployables."
  - "FinOps: cost budgets, autoscaling right-sizing, and idle resource reaping."
  - "Chaos & DR confidence: game days + automated failover smoke in stage."
  - "Product SLO v1: per-service p95/availability baselines captured and alerted."
---

# Sprint 25 Plan — Progressive Hardening & Governed Delivery

Assumes Sprint 24 artifacts are live (canaries, preview envs, OTEL baseline, OPA/Sealed Secrets, DR drill). This sprint focuses on reliability under change (migrations), secure supply chain, and cost control without performance regressions.

---

## 0) Definition of Ready (DoR)
- [ ] Migration PRs include **gate artifacts** (up/down SQL, checksums) and **backfill plan**.
- [ ] Each service declares **SLOs** (p95 latency, availability) with target & owner.
- [ ] Budget caps set (namespace & workload) with alert channels.
- [ ] Feature flags prepared for risky toggles; defaults safe.

---

## 1) Swimlanes

### A. Zero-Downtime Migrations (Deployment Engineer + DB)
1. **Expand / Migrate / Contract** pattern codified.
2. **Online backfill** jobs; **dual-writes** (flag-protected) where needed.
3. **Read path tolerance** for old+new columns with feature flags and read adapters.

### B. Supply Chain Security (CI/CD Engineer)
1. **SLSA provenance** for container builds; **cosign** signing + **policy-controller** verify at admission.
2. **SBOM attestations** bundled and published; block deploy on unsigned images.

### C. FinOps & Autoscaling (Platform)
1. **HPA/VPA** tuning from metrics; right-size requests/limits.
2. **Idle reaper** for preview envs & orphaned volumes.
3. **Cost dashboards** with per-namespace spend and budget alerts.

### D. Chaos & DR
1. **Game day** in stage (pod kill, node drain, network delay) with runbook validation.
2. **Automated failover smoke** job nightly in stage (no user impact).

### E. Observability & SLOs
1. **Service SLO v1** recorded; burn alerts wired to on-call.
2. **Trace coverage to 90%** for key transactions; DB spans labeled with table/index.

### F. Repo Arborist
- ADR templates; CODEOWNERS for migrations directory; stale preview cleanup action.

---

## 2) Measurable Goals
- 100% migrations use **expand/migrate/contract** with verified backfill and rollback in stage.
- 100% images signed; **admission denies unsigned** in stage/prod.
- Reduce cluster cost by **≥15%** (requests right-sizing + preview TTL).
- Trace continuity **≥90%** for `gateway→service→DB` on top 3 user paths.
- Chaos game day passes; DR nightly smoke green 7/7 nights.

---

## 3) Risk Register
| Risk | Prob | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Backfill load degrades prod | M | H | Throttle + schedule off-peak, use `LIMIT/OFFSET` or PK ranges, observe p95 | Deploy |
| Signature verification blocks hotfix | L | M | Emergency key escrow & break-glass with audit | CI/CD |
| Autoscaling thrash | M | M | Stabilize with min/max replicas and longer stabilization windows | Platform |
| Chaos tests cause noisy alerts | M | L | Silence windows + chaos labels; notify on-call | Platform |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-A: Zero-Downtime Migrations
- [ ] MIG-601 — Template repo for **EMC** migrations (`ops/migrations/EMC.md` + script pack)
- [ ] MIG-602 — Online backfill Job scaffold (idempotent + rate limit)
- [ ] MIG-603 — Read-adapter layer to tolerate nullable/new columns
- [ ] MIG-604 — Dual-write behind flag for `docs-api` critical table

### EPIC-B: Supply Chain (SLSA + Cosign)
- [ ] SUP-651 — Generate SLSA provenance in CI (GitHub OIDC to registry)
- [ ] SUP-652 — Cosign sign&verify; publish public key; Admission policy to **require signature**
- [ ] SUP-653 — SBOM attestation uploaded to registry, linked in release notes

### EPIC-C: FinOps & Autoscaling
- [ ] FIN-701 — Request/limit right-sizing pass with load test evidence
- [ ] FIN-702 — Preview env TTL reaper & orphaned PVC GC
- [ ] FIN-703 — Cost dashboard & monthly budget alerts

### EPIC-D: Chaos & DR
- [ ] CHA-751 — Game day suite (kill, drain, net-delay) + runbook verifications
- [ ] CHA-752 — Nightly failover smoke Job in stage

### EPIC-E: Observability & SLOs
- [ ] SLO-801 — Define SLOs per service; publish as code
- [ ] SLO-802 — Trace coverage to 90%; DB spans

### EPIC-F: Arborist & Governance
- [ ] GOV-851 — ADR template + sample ADRs for SLSA and EMC migrations
- [ ] GOV-852 — CODEOWNERS: enforce review on `/ops/migrations/**`

---

## 5) Scaffolds & Snippets

### 5.1 EMC Migration Template
**Path:** `ops/migrations/EMC.md`
```md
# Expand / Migrate / Contract (EMC)
## Expand
- Add new columns/tables **nullable** or with safe defaults
- Create dual-write & backfill Jobs (flag-protected)
## Migrate
- Write path flips to new schema (feature flag)
- Read adapters handle old+new
## Contract
- After soak, remove old columns/paths; finalize indexes
## Rollback
- Disable flag; writes revert; reads tolerate both
```

### 5.2 Backfill Job Scaffold
**Path:** `ops/migrations/backfill.ts`
```ts
import pLimit from 'p-limit';
import { Pool } from 'pg';
const limit = pLimit(Number(process.env.CONCURRENCY||'4'));
const BATCH = Number(process.env.BATCH||'1000');
const SLEEP = Number(process.env.SLEEP_MS||'250');
(async () => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  let lastId = Number(process.env.START_ID||'0');
  while (true) {
    const { rows } = await db.query('SELECT id, old_col FROM items WHERE id > $1 ORDER BY id ASC LIMIT $2', [lastId, BATCH]);
    if (!rows.length) break;
    await Promise.all(rows.map(r => limit(async () => {
      await db.query('UPDATE items SET new_col = $1 WHERE id=$2', [transform(r.old_col), r.id]);
    })));
    lastId = rows[rows.length-1].id;
    await sleep(SLEEP);
  }
  await db.end();
})();
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }
function transform(x:any){ return x; }
```

### 5.3 Feature-Flagged Dual-Write
**Path:** `services/docs-api/src/repo/write.ts`
```ts
export async function saveDoc(input){
  await db.insert('docs_new', input);
  if(process.env.FLAG_DUAL_WRITE==='true'){
    await db.insert('docs_old', downgrade(input));
  }
}
```

### 5.4 ZAP Baseline Action (nightly)
**Path:** `.github/workflows/zap-baseline.yml`
```yaml
name: zap-baseline
on:
  schedule: [{ cron: '0 7 * * *' }]
  workflow_dispatch:
jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.11.0
        with:
          target: ${{ secrets.ZAP_TARGET_URL }}
          cmd_options: '-m 5 -t 60'
```

### 5.5 k6 e2e Path Checks
**Path:** `tests/k6/e2e.js`
```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { thresholds: { http_req_duration: ['p(95)<1500'], http_req_failed: ['rate<0.02'] } };
export default function(){
  const s = http.get(`${__ENV.BASE_URL}/search?q=ok`);
  check(s, { 'search 200': r=>r.status===200 });
  const d = http.get(`${__ENV.BASE_URL}/docs/1`);
  check(d, { 'doc 200': r=>r.status===200 });
  sleep(1);
}
```

### 5.6 SLSA + Cosign (build & verify)
**Path:** `.github/workflows/slsa-cosign.yml`
```yaml
name: supply-chain
on: [push, workflow_dispatch]
permissions:
  id-token: write
  contents: read
  packages: write
jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t $REG/$IMAGE:${{ github.sha }} .
      - name: Push
        run: docker push $REG/$IMAGE:${{ github.sha }}
      - name: Generate provenance (SLSA level 3)
        uses: slsa-framework/slsa-github-generator@v2
        with:
          artifact_type: container
      - name: Cosign sign
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes $REG/$IMAGE:${{ github.sha }}
  verify-admission:
    needs: build-sign
    runs-on: ubuntu-latest
    steps:
      - name: Policy dry-run
        run: echo "kubectl apply -f policy/verify-signed.yaml --server-dry-run"
```

**Admission Policy (Kyverno example)**
**Path:** `policy/verify-signed.yaml`
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: require-signed-images }
spec:
  validationFailureAction: Enforce
  rules:
  - name: verify-signature
    match: { resources: { kinds: [Deployment, StatefulSet, DaemonSet] } }
    verifyImages:
    - image: "ghcr.io/your-org/*"
      key: "k8s://kyverno/signing-key"
```

### 5.7 Cost Dashboard & Budgets
**Path:** `charts/monitoring/templates/cost-recording.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: cost-budgets }
data:
  budgets.yaml: |
    namespaces:
      dev: { monthly_usd: 500 }
      stage: { monthly_usd: 800 }
      prod: { monthly_usd: 3000 }
```
**Path:** `tools/cost-alert.js`
```js
// pseudo: read cloud billing export / metrics; post to Slack when burn > 80%
```

### 5.8 Preview TTL Reaper
**Path:** `.github/workflows/preview-ttl.yml`
```yaml
name: preview-ttl-reaper
on:
  schedule: [{ cron: '0 */6 * * *' }]
jobs:
  reap:
    runs-on: ubuntu-latest
    steps:
      - name: Reap stale namespaces
        run: |
          kubectl get ns -l pr=true -o json | jq -r '.items[] | select(.metadata.creationTimestamp < (now- (72*3600)) ) | .metadata.name' | xargs -r kubectl delete ns
```

### 5.9 SLO-as-Code
**Path:** `slo/catalog.yaml`
```yaml
services:
  gateway:
    latency_p95_ms: 1500
    availability: 99.9
  docs-api:
    latency_p95_ms: 1500
    availability: 99.9
```

---

## 6) Environment Promotions & Gates
| Stage | Preconditions | Action | Verification | Rollback |
|---|---|---|---|---|
| dev | Signed images; tests green | Deploy EMC **Expand** + backfill dry-run | RED metrics stable | `helm rollback` |
| stage | Backfill throttled; chaos window scheduled | Backfill live + dual-write; **Migrate** | p95, errors, write/read success; traces 90% | Flip flag off |
| prod | Stage soak 48h; signatures enforced | **Contract** after backfill complete | Golden signals + audit | Re-add old cols; disable new path |

---

## 7) Acceptance Evidence
- CI artifacts: provenance JSON, cosign signatures; SBOMs linked.
- Dashboards: p95/error before/after EMC; cost graph showing ≥15% reduction.
- Chaos results: incident runbook checklists with timestamps.
- DR nightly logs: 7/7 green.

---

## 8) Calendar & Ownership
- **Week 1**: SLSA+cosign; EMC templates; k6 e2e; SLO catalog; preview reaper.
- **Week 2**: Backfill + dual-write in stage; chaos game day; contract in prod for low-risk table; cost tuning; release cut.

Release cut: **2025-10-24 (Fri)** with canary 24–48h; rollback scripted.

---

## 9) Issue Seeds (create via `gh issue create`)
- MIG-601/2/3/4, SUP-651/2/3, FIN-701/2/3, CHA-751/2, SLO-801/2, GOV-851/2

---

## 10) Checklists (clip into issues)
**EMC**
- [ ] Expand done; reads tolerant; backfill idempotent
- [ ] Migrate flag on; p95 stable
- [ ] Contract complete; old paths removed; rollback tested

**Supply Chain**
- [ ] Signed images only in stage/prod
- [ ] Provenance published per image
- [ ] Admission policy enforced

**FinOps**
- [ ] Requests/limits tuned; no throttling
- [ ] Cost budget alerts wired
- [ ] Preview/PVC reaper active

**Chaos/DR**
- [ ] Game day scenarios pass
- [ ] Nightly failover smoke green

**SLOs**
- [ ] Catalog merged
- [ ] Burn alerts firing in test
- [ ] Trace continuity ≥ 90%

---

_End of Sprint 25 plan._
```

