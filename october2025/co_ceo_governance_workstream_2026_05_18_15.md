# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** May 18–May 29, 2026 (Sprint 15; Q2 cadence)

**Role:** Co‑CEO (Governance, Evidence, Compliance, Buyer/Partner Enablement)

**Theme:** **Scale partners, harden operations, and prep mid‑cycle board update** — multi‑tenant Trust Portal v3, partner cohort scale‑up, revenue & SLA evidence automation, and SLSA L3 adoption playbook extended.

---

## 1) Sprint Goal
“Turn the provenance platform into a **repeatable multi‑tenant product**: ship Trust Portal v3 (multi‑tenant), scale partner onboarding to a cohort, auto‑generate board‑grade revenue + SLA evidence, and expand SLSA L3 adoption without slipping SLOs.”

---

## 2) Objectives & Key Results (OKRs)
1) **Partner cohort scale‑up (≥ 5 tenants)** onboarded via wizard.  
   *Measure:* 5 tenants complete onboarding < 1 hour each; webhook tests pass; packs verified.
2) **Trust Portal v3 (multi‑tenant)** live.  
   *Measure:* Tenant switcher + policy/presentation isolation; uptime ≥ 99.95%.
3) **Mid‑cycle board pack automation** ready.  
   *Measure:* `board-mid-Q2-2026.pdf` generated with hashes + links.
4) **SLSA L3 adoption ≥ 8 repos**.  
   *Measure:* Hermetic jobs green; provenance subjects pinned.
5) **Evidence SLOs**: time‑to‑pack p50 ≤ **7 min**; portal error budget burn < **5%**.  
   *Measure:* Dashboards green; alerts ≤ 1/day.

---

## 3) Deliverables (Definition of Done)
- **Trust Portal v3 (multi‑tenant)**: tenant switcher, RBAC/OPA isolation, per‑tenant billing + usage, finance and audit views, and SLSA map.
- **Partner Cohort Toolkit**: batch onboarding CLI, telemetry, cohort dashboard (progress, failures, time‑to‑first‑verify), and office‑hours playbook.
- **Board Mid‑Q2 Pack**: PDF + appendix with revenue ETL report, SLA compliance, policy bundle hashes, partner count, and design‑partner status.
- **SLSA L3 rollout extension**: add 2 more repos using org hermetic workflow; runner capacity plan + queueing.
- **Reliability polish**: CI time shaving (cache & concurrency), portal health checks, graceful degradation for rate limits.

---

## 4) Work Plan & Owners
| Date | Work Item | Owner | Exit Criteria |
|---|---|---|---|
| May 18 | v3 design lock + data model | PM + Co‑CEO | Multi‑tenant schema + OPA guards committed |
| May 19 | Tenant switcher + isolation | DevEx | Switcher works; no cross‑tenant data leak (tests) |
| May 20 | Batch onboarding CLI + telemetry | DevEx | `npx trust-portal-onboard --batch tenants.csv` completes |
| May 21 | SLSA rollout to repos G/H | SecOps + DevEx | Hermetic jobs green; provenance verified |
| May 22 | Board mid‑Q2 pack generator | Co‑CEO | PDF generated; hashes recorded |
| May 23 | Cohort office hours + fixes | Co‑CEO | 5 tenants verified; issues triaged |
| May 27 | Reliability polish (CI+portal) | DevEx | p50 time‑to‑pack ≤ 7 min; health checks green |
| May 28 | Finalize dashboards & demo | Co‑CEO | Cohort dashboard + SLSA map render |
| May 29 | Sprint demo + retro | Co‑CEO | OKRs measured; risks updated |

---

## 5) Artifacts & Scaffolding

### 5.1 Trust Portal v3 — Multi‑tenant Core
**Path:** `tools/trust-portal-v3/README.md`
```md
# Trust Portal v3 (Multi‑tenant)
- Tenant switcher
- OPA presentation guards per tenant
- Billing/usage per tenant
- Finance/Audit/SLSA tabs per tenant
```

**Tenant switcher** `components/TenantSwitcher.tsx`
```tsx
export function TenantSwitcher({tenants, onSelect}:{tenants:string[];onSelect:(t:string)=>void}){
  return <select className="p-2 rounded-2xl shadow" onChange={e=>onSelect(e.target.value)}>
    {tenants.map(t=> <option key={t}>{t}</option>)}
  </select>
}
```

**OPA guard** `policies/presentation.multi.rego`
```rego
package presentation

# Only allow fields for the active tenant & legal basis
allow_field {
  input.tenant == data.tenants.allowed[_]
  data.presentation[input.tenant][input.legal_basis][input.purpose][_] == input.field
}
```

### 5.2 Batch Onboarding CLI + Telemetry
**Path:** `tools/trust-portal-onboard/bin/index.mjs`
```js
#!/usr/bin/env node
import fs from 'fs';
import { spawnSync as sh } from 'child_process';
const csv = fs.readFileSync(process.argv[2]||'tenants.csv','utf8').trim().split(/\r?\n/)
for (const line of csv){
  const [tenant, webhook] = line.split(',');
  console.log('Onboarding', tenant)
  sh('npm', ['create','trust-portal', tenant], {stdio:'inherit'})
  sh('curl', ['-fsS','-X','POST', webhook, '-d','{"ping":true}'], {stdio:'inherit'})
  // emit telemetry row
  fs.appendFileSync('onboarding.log', `${new Date().toISOString()},${tenant},ok\n`)
}
```

**Cohort dashboard data model** `tools/cohort/dashboard.json`
```json
{ "tenants": [], "metrics": { "onboarded": 0, "verified": 0, "avg_time_min": 0 } }
```

### 5.3 Board Mid‑Q2 Pack Generator
**Path:** `tools/board/midq2.mjs`
```js
import fs from 'fs'
const m = JSON.parse(fs.readFileSync('metrics/summary.json','utf8'))
const pdf = `# Board — Mid Q2 2026\n\n- North Star: ${m.north_star}\n- Evidence coverage: ${m.evidence_coverage}%\n- Uptime: ${m.uptime}\n- API p95: ${m.p95} ms\n- Partners: ${m.partners}\n- SLSA L3 repos: ${m.slsa_l3}\n- Revenue (MTD): $${m.revenue_mtd}\n\n## Links\n- Disclosure Portal: ${m.portal_url}\n- Latest tag: ${m.latest_tag}\n- Ledger hash: ${m.ledger_hash}\n`;
fs.writeFileSync('board-mid-Q2-2026.md', pdf)
```

**CI step:** render to PDF and attach to release.

### 5.4 SLSA L3 Rollout Ext — Runner Queueing
**Path:** `security/runner-capacity.md`
```md
- Pool size, contention windows, priority queues
- Max concurrent hermetic jobs per hour
- Backoff strategy + alerts
```

**Queue tags** in `org.release.hermetic.yml`: add `concurrency: group: hermetic-${{ github.ref_name }}`.

### 5.5 Reliability Polish — CI Time Shaving
**Path:** `.github/actions/cache-node/action.yml`
```yaml
name: cache-node
runs: { using: 'composite', steps: [{ shell:'bash', run:'echo using pnpm cache' }] }
```

Integrate `actions/cache@v4` for pnpm store; parallelize OSV/Trivy with job matrix; gate only on combined status.

---

## 6) Dashboards & Alerts
- **Cohort progress**: onboarded/verified/time‑to‑verify; alert if failure > 10%.  
- **Portal v3 uptime** ≥ 99.95%; auth errors spike alert.  
- **SLSA adoption**: 8 repos green; queue saturation alerts.  
- **Evidence SLOs**: p50 ≤ 7 min; alert > 9 min.  
- **Board pack completeness**: all links/hashes valid.

---

## 7) Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Multi‑tenant isolation bug | Med | High | Unit + integration tests; OPA guard unit tests |
| Onboarding batch failures | Med | Med | Retry with backoff; office hours; manual overrides |
| Runner capacity bottlenecks | Med | Med | Queueing + staged rollouts + schedule windows |
| Board pack data drift | Low | Med | Metrics source of truth; hash ledger verification |

---

## 8) Alignment Notes
- Builds on Sprint 14 (finance view, revenue ETL, SLSA scale, Audit #2).  
- Sets up Sprint 16 (Jun 1–Jun 12): partner scale, Trust Portal v3.1 (permissions + audit logs), and Q2 board mid‑cycle review.

---

## 9) Exit Checklist
- 5 partners onboarded and verified in ≤ 1 hour each.  
- Trust Portal v3 deployed with tenant switcher + isolation tests green.  
- Board mid‑Q2 evidence pack attached; hashes logged.  
- SLSA L3 jobs green across ≥ 8 repos; runner plan committed.  
- Evidence SLOs met; dashboards green; demo recorded.
