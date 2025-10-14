```markdown
# IntelGraph — Multi‑Region, DR & Zero‑Downtime Ops Sprint (v1.13.0)
**Slug:** `sprint-2026-06-08-intelgraph-v1-13`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-06-08 → 2026-06-19 (10 business days)  
**Theme:** **Always‑On IntelGraph** — active‑active multi‑region, zero‑downtime deploys, data‑residency routing, automated SLO enforcement, and chaos‑tested DR.

---
## 0) North Stars & DoD
- **No Downtime:** Production deploys complete with p95 error spike < **1%** and no 5xx bursts > **5/min**.
- **Resilient by Design:** Region failover (US↔EU) cuts over in **< 5 minutes** RTO with **≤ 60s** RPO for hot paths.
- **Data Residency:** Requests and data constrained to tenant region(s); policy‑verified at read/write time.
- **SLO Enforcement:** Error budgets auto‑gate releases; rollback triggers when violated; on‑call gets actionable pages.

**DoD Gate:**
1) Demo: blue‑green deploy with canary; traffic ramps to green; SLO guard prevents rollout on induced fault; auto‑rollback works.  
2) Pull the plug on **US‑East**: traffic drains to **EU‑West**, write‑routing flips, dashboards show healthy p95; RPO/RTO met.  
3) Residency policy blocks cross‑region access; denial reasons visible; audit export shows region compliance over last 7 days.

---
## 1) Epics → Objectives
1. **Multi‑Region Topology (MR‑E1)** — Neo4j causal cluster w/ read replicas per region; Postgres logical replication; Redis multi‑region cache strategy.
2. **Zero‑Downtime Delivery (ZDD‑E2)** — Blue‑green + canary, schema migration gates, feature flags, sticky session migration.
3. **Residency & Routing (RES‑E3)** — Tenant→region map, request pinning, data partitioning, OPA enforcement, audit.
4. **SLO & Error Budgets (SLO‑E4)** — Define SLOs per slice; budget burn alerts; automated rollback; deployment scoring.
5. **Chaos & DR (CHA‑E5)** — Fault injection, region blackhole drills, backup/restore verify, runbooks.
6. **QA/Docs (QA‑E6)** — E2E failover tests, migration rehearsals, operator guides.

---
## 2) Swimlanes
### Frontend (React + MUI + jQuery)
- Deployment Console: canary % slider, health indicators, rollback button, SLO guard banner.
- Residency badges & tooltips; region selector for admins; read/write status chip.
- Incident banner & session resumer during failover.

### Backend (Node/Express + Apollo + Neo4j + Postgres + Redis)
- Region‑aware drivers; write primary per tenant; read replicas local; transaction idempotency keys.
- Blue‑green deploy hooks; migration prechecks; feature flag service.
- Residency guard middleware; audit of region decisions; cross‑region queue for replication lag.

### Ops/SRE & Security
- Terraform/Helm for multi‑region; global DNS/traffic manager; backup verify jobs; chaos experiments.
- SLO/error budget automation in CI/CD; pager policies; Grafana dashboards.

### QA/Docs
- Playbooks for failover/rollback; E2E chaos scripts; migration rehearsal checklist; residency compliance report.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ **92 pts**

### Multi‑Region Topology (32 pts)
1. Neo4j causal cluster + regional read replicas.  
   **AC:** Writes land in home region; reads prefer local; replica lag panel; auto‑promote on failover. (**XL**)
2. Postgres logical replication (primary↔standby).  
   **AC:** RPO ≤ 60s; slot monitoring; switchover runbook. (**L**)
3. Redis strategy (local cache + global invalidation).  
   **AC:** Region‑local caches; cross‑region invalidation via pub/sub; hit rate ≥ 85% post‑failover. (**M**)

### Zero‑Downtime Delivery (22 pts)
4. Blue‑green + canary with SLO guard.  
   **AC:** Canary 5→25→50→100%; auto‑halt on budget burn; 1‑click rollback. (**L**)
5. Safe schema migrations.  
   **AC:** Expand‑migrate‑contract pattern; checks in CI; shadow reads during canary. (**L**)

### Residency & Routing (20 pts)
6. Tenant→region map + request router.  
   **AC:** Sticky region pin; override for break‑glass; audit trail. (**L**)
7. OPA residency enforcement.  
   **AC:** Deny cross‑region writes; explicit exemptions logged; weekly compliance report. (**M**)

### SLO & DR (12 pts)
8. Budget burn alerts & auto‑rollback.  
   **AC:** Burn rate 2×/6× multi‑window; rollout gate; rollback webhook. (**M**)
9. DR drills & backup verify.  
   **AC:** Scheduled blackhole drills; restore verifies hashes; RTO/RPO met. (**M**)

### QA/Docs (6 pts)
10. Chaos E2E + runbooks.  
    **AC:** Region kill test passes; migration rehearsal doc; operator guides. (**S**)

---
## 4) Architecture & Scaffolds

### 4.1 Region‑Aware Neo4j Sessions
```ts
// server/src/db/regions.ts
import neo4j from 'neo4j-driver'
const drv:Record<string, neo4j.Driver> = {
  'us-east': neo4j.driver(process.env.NEO4J_USEAST!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)),
  'eu-west': neo4j.driver(process.env.NEO4J_EUWEST!, neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!))
}
export function session(kind:'read'|'write', region:string){
  const driver = drv[region] || drv['us-east']
  return driver.session({ defaultAccessMode: kind==='read'?'READ':'WRITE' })
}
```

### 4.2 Request Router & Residency Guard
```ts
// server/src/middleware/residency.ts
import { getTenantRegion } from '../tenants/map'
export function routeByRegion(req,res,next){
  const tenant = req.headers['x-tenant'] as string
  const region = getTenantRegion(tenant)
  req.ctx = { ...(req.ctx||{}), tenant, region }
  next()
}
export function enforceResidency(req,res,next){
  const allowed = req.body?.variables?.region === req.ctx.region || !req.body?.variables?.region
  if (!allowed) return res.status(403).json({ error:'ResidencyViolation', region:req.ctx.region })
  next()
}
```

### 4.3 Postgres Logical Replication (SQL)
```sql
-- ops/db/primary.sql
CREATE PUBLICATION ig_pub FOR ALL TABLES;
-- on standby
CREATE SUBSCRIPTION ig_sub CONNECTION 'host=primary dbname=ig user=replicator password=***' PUBLICATION ig_pub WITH (create_slot = true, slot_name = 'ig_slot');
```

### 4.4 Global DNS & Traffic Manager (Terraform)
```hcl
# ops/infra/traffic.tf
resource "aws_route53_health_check" "api_useast" { type = "HTTPS" resource_path = "/health" fqdn = "api.useast.ig.example.com" }
resource "aws_route53_health_check" "api_euwest" { type = "HTTPS" resource_path = "/health" fqdn = "api.euwest.ig.example.com" }
resource "aws_route53_record" "api" {
  zone_id = var.zone
  name    = "api.ig.example.com"
  type    = "A"
  set_identifier = "weighted"
  weighted_routing_policy { weight = 50 }
  alias { name = aws_lb.useast.dns_name zone_id = aws_lb.useast.zone_id evaluate_target_health = true }
  failover_routing_policy { type = "PRIMARY" }
}
```

### 4.5 Blue‑Green Deploy Hook (GitHub Actions)
```yaml
# .github/workflows/deploy-bluegreen.yml
name: Deploy Blue‑Green
on: [workflow_dispatch]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy green
        run: ./ops/scripts/deploy.sh green
      - name: Start canary 5%
        run: ./ops/scripts/canary.sh 5
      - name: SLO guard
        run: node tools/slo/guard.js --max-burn-6x 5m --max-errors-p95 1
      - name: Ramp 25% → 50% → 100%
        run: ./ops/scripts/canary.sh 25 && ./ops/scripts/canary.sh 50 && ./ops/scripts/canary.sh 100
      - name: Flip blue→green
        run: ./ops/scripts/flip.sh
```

### 4.6 Feature Flags (LaunchDarkly‑like, OSS)
```ts
// server/src/flags/service.ts
const flags:Record<string,boolean> = { 'newOverlay': false }
export function isOn(key:string, ctx:any){ return !!flags[key] }
export function setFlag(key:string, val:boolean){ flags[key]=val }
```

### 4.7 OPA — Residency Policy
```rego
package intelgraph.residency

default allow = false

allow {
  input.tenant.region == input.request.region
}

deny_reason[msg] {
  input.tenant.region != input.request.region
  msg := sprintf("tenant region %v does not match request region %v", [input.tenant.region, input.request.region])
}
```

### 4.8 Error Budget Burn (PromQL & Gate)
```yaml
# tools/slo/queries.yaml
burn_6x: sum_over_time(rate(http_request_errors_total[5m])[30m:]) / (0.01 * sum_over_time(rate(http_requests_total[5m])[30m:]))
```
```ts
// tools/slo/guard.js (excerpt)
if (burn6x > threshold) { console.error('SLO burn too high — halting rollout'); process.exit(1) }
```

### 4.9 Chaos: Region Blackhole (Bash)
```bash
# tools/chaos/blackhole.sh
REGION=$1; kubectl --context $REGION -n ig scale deploy api --replicas=0
sleep 60
kubectl --context $REGION -n ig scale deploy api --replicas=3
```

### 4.10 Backup Verify (Node)
```ts
// tools/backup/verify.ts
import crypto from 'crypto'
import fs from 'fs'
export function verifyDump(path:string, manifest:any){
  const bytes = fs.readFileSync(path)
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
  return hash === manifest.sha256
}
```

---
## 5) Delivery Timeline
- **D1–D2:** Region‑aware drivers; Postgres logical replication; Redis invalidation bus; residency middleware.  
- **D3–D4:** Blue‑green + canary; feature flags; schema migration gates; SLO guard in CI/CD.  
- **D5–D6:** Terraform traffic manager; failover scripts; backup verify; OPA residency enforcement + report.  
- **D7:** Chaos drills (blackhole, latency); dashboards; runbooks.  
- **D8–D10:** End‑to‑end failover rehearsal; docs; demo polish.

---
## 6) Risks & Mitigations
- **Split‑brain writes** → single write‑home per tenant, idempotency keys, write fences.  
- **Replica lag effects** → read‑your‑writes hints, sticky session, degrade UX with banners.  
- **Migration breakage** → expand/contract strategy, shadow reads, instant rollback.  
- **Policy bypass** → OPA deny‑by‑default, audit trails, periodic residency report.

---
## 7) Metrics
- RPO/RTO achieved; error budget burn; canary halt count; replica lag; cache hit; residency denials; failover MTTR.

---
## 8) Release Artifacts
- **ADR‑046:** Multi‑region topology & routing.  
- **ADR‑047:** Zero‑downtime migrations & delivery.  
- **RFC‑038:** Residency policy & compliance reporting.  
- **Runbooks:** Failover; rollback; blackhole drill; backup restore verify.  
- **Docs:** Deployment console; residency admin; SLO handbook.

---
## 9) Definition of Ready
- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---
## 10) Demo Script (15 min)
1) Canary rollout with SLO guard; show auto‑halt then rollback when fault injected.  
2) Trigger region blackhole; traffic shifts; p95 stays under SLO; RPO/RTO shown; resume region.  
3) Residency violation attempt → denial with reason; show compliance report & audit export.  
4) Review dashboards: burn rate, replica lag, canary health; conclude with backup verify.

---
## 11) Out‑of‑Scope (backlog)
- Multi‑cloud active‑active; per‑field residency; CRDT multi‑region writes; global edge inference.
```

