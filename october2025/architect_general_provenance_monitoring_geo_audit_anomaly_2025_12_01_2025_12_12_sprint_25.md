# Architect-General — Provenance Monitor, Geo‑Sharded Audit, Anomaly Detection, Region‑Aware Caching

**Workstream:** Governance Observability & Data Resilience — Switchboard Platform  
**Sprint Window:** 2025-12-01 → 2025-12-12 (10 biz days)  
**Ordinal:** Sprint 25 (Q4’25 cadence)  
**Prime Objective:** Operationalize trust as a product surface: continuous **policy provenance monitoring**, **geo‑sharded audit** with lawful residency, **region‑aware caching** for UX continuity under failover, **anomaly detection** on audit streams, and a **Provenance Viewer** that traverses build→bundle→Rekor→deploy→runtime verify.

---

## 0) Executive Summary
- **Track A (Now‑value):**
  - **Provenance Monitor**: watches releases, policy bundles, Rekor, and runtime verify; alerts on drift or missing proofs.
  - **Geo‑Sharded Audit v0.2**: EU/US partitions, residency‑constrained writes/reads, export with region proofs.
  - **Region‑Aware Caching**: edge + client cache keyed by region with session continuity during failover.
  - **Provenance Viewer UI**: end‑to‑end chain with quick verification and copyable references.
- **Track B (Moat):**
  - **Anomaly Detection** on audit streams (baseline + rules + simple anomaly score) with playbooks.
  - **IdP Presets** for ABAC mapper (Okta/Entra/Auth0) and validation harness.

**Definition of Done:**
- Monitor raises alerts on unsigned/unstamped bundles, Rekor gaps, or runtime verify failures; evidence archived.
- Audit writes respect residency; cross‑region reads gated; export manifests show region + hash.
- Users maintain session continuity on region failover; cache invalidation correct; SLOs hold.
- Provenance Viewer renders a green end‑to‑end chain for the current release.
- Anomaly jobs detect simulated exfil/role‑spike scenarios; alerts reach on‑call with actionable context.

---

## 1) Objectives & Key Results

**OBJ‑1: Provenance Monitor (Continuous)**  
- **KR1.1** Event sources: Release created, Bundle built, Cosign sign, Rekor UUID, Init verify logs.  
- **KR1.2** Correlate by `release_sha` → `bundle_digest` → `rekor_uuid` → `deploy_rev`.  
- **KR1.3** Alerting: Slack + Pager on gaps (SLO: detect < 5m).  
- **KR1.4** Evidence pack auto‑generated per release.

**OBJ‑2: Geo‑Sharded Audit v0.2**  
- **KR2.1** Schema adds `region` and `origin_digest`; partial indexes per region.  
- **KR2.2** Router writes to region‑local shard; queries default to user region; cross‑region with `export_only=true`.  
- **KR2.3** Export manifests include `region`, row count, SHA256; verifier script provided.

**OBJ‑3: Region‑Aware Caching & Session Continuity**  
- **KR3.1** Edge cache `Cache‑Key: {route, region}`; session cookie mirrored across regions with signed envelope.  
- **KR3.2** On failover, UI uses cached data + background revalidation; no re‑auth for 15 minutes.

**OBJ‑4: Provenance Viewer**  
- **KR4.1** UI page shows chain with status, timestamps, digests, Rekor link.  
- **KR4.2** Quick verify button: re‑checks cosign + Rekor; result cached 15m.

**OBJ‑5: Audit Anomaly Detection**  
- **KR5.1** Baselines: per‑action rate, deny ratio, step‑up failure rate; sliding windows.  
- **KR5.2** Rules: impossible travel (region flip < 5m), privilege spike, export burst.  
- **KR5.3** Alerting & runbook with triage checklist.

**OBJ‑6: ABAC Mapper Presets & Validation**  
- **KR6.1** IdP presets packaged; schema validation; sample assertions.  
- **KR6.2** CI harness runs mapping tests; policy tests must pass with mapped context.

---

## 2) Work Breakdown & Owners

| # | Epic | Issue | Owner | Acceptance | Evidence |
|---|------|-------|-------|------------|----------|
| A | ProvMon | Event correlator + alerts | SRE | Gap detected <5m, alert fired | Alert IDs, logs |
| B | Audit | Geo‑shard schema + router | DataEng | Residency writes enforced | Query plans, region counts |
| C | Cache | Region‑aware cache + session mirroring | AppEng | Failover continuity works | Synthetic + user journey score |
| D | UI | Provenance Viewer | FE | Chain complete, verify button passes | Screenshots, digests |
| E | Anomaly | Baselines + rules + alerts | SecEng | Detected simulated incidents | Alert artifacts, postmortem |
| F | SSO | IdP presets + tests | AppEng | CI mapping suite green | Test matrix report |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 Provenance Monitor
**Event Schema (`contracts/provenance.events.json`)**
```json
{
  "$id":"https://companyos/contracts/provenance.events.json",
  "type":"object",
  "properties":{
    "type":{"enum":["release","bundle","sign","rekor","deploy","runtime_verify"]},
    "release_sha":{"type":"string"},
    "bundle_digest":{"type":"string"},
    "rekor_uuid":{"type":"string"},
    "deploy_rev":{"type":"string"},
    "ts":{"type":"string","format":"date-time"}
  },
  "required":["type","ts"]
}
```

**Correlator (`ops/provmon/correlate.ts`)**
```ts
import { groupBy } from 'lodash-es';
export function correlate(events:any[]){
  const byRel = groupBy(events, e=> e.release_sha || e.bundle_digest || 'orphan');
  const chains = [] as any[];
  for(const rel in byRel){
    const es = byRel[rel];
    chains.push({
      release_sha: es.find(e=>e.release_sha)?.release_sha,
      bundle_digest: es.find(e=>e.bundle_digest)?.bundle_digest,
      rekor_uuid: es.find(e=>e.rekor_uuid)?.rekor_uuid,
      deploy_rev: es.find(e=>e.deploy_rev)?.deploy_rev,
      stages: es.map(e=>({ type:e.type, ts:e.ts }))
    });
  }
  return chains;
}
```

**Alert Rules (`ops/provmon/rules.yaml`)**
```yaml
rules:
  - id: missing-rekor
    description: Bundle signed but no Rekor entry within 5m
    when: "sign -> (no rekor within 5m)"
    severity: high
  - id: runtime-verify-fail
    description: Startup verify failed for deployed digest
    when: "deploy -> runtime_verify(status=fail)"
    severity: critical
```

**GitHub Action (`.github/workflows/provmon.yml`)**
```yaml
name: provmon
on:
  schedule: [{ cron: '*/5 * * * *' }]
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Collect events
        run: node ops/provmon/collect.js > events.json
      - name: Correlate & evaluate
        run: node ops/provmon/evaluate.js events.json ops/provmon/rules.yaml > report.json
      - name: Alert on gaps
        run: node ops/provmon/alert.js report.json
      - uses: actions/upload-artifact@v4
        with: { name: provmon-report, path: report.json }
```

### 3.2 Geo‑Sharded Audit v0.2
**Schema Migration (`db/migrations/20251201_audit_geo.sql`)**
```sql
alter table audit_events add column if not exists region text not null default 'US';
create index if not exists audit_events_region_ts on audit_events (region, ts desc);
create table if not exists audit_events_eu (like audit_events including all);
create table if not exists audit_events_us (like audit_events including all);
```

**Router (`apps/server/lib/audit-router.ts`)**
```ts
export async function auditInsert(ev:any, region:'US'|'EU', db:any){
  const tbl = region==='EU' ? 'audit_events_eu' : 'audit_events_us';
  await db.insert(tbl, { ...ev, region });
}
export async function auditQuery(q:any, region:'US'|'EU', db:any){
  const tbl = region==='EU' ? 'audit_events_eu' : 'audit_events_us';
  if(q.crossRegion && q.export_only===true){ /* read from both with union all */ }
  return db.query(`select * from ${tbl} where ts between $1 and $2 order by ts desc limit $3 offset $4`, [q.from, q.to, q.limit, q.offset]);
}
```

**Export Manifest (`/api/audit/export2`)**
```ts
// response headers: x-region, x-sha256, x-count
```

### 3.3 Region‑Aware Caching & Session Continuity
**Signed Session Envelope (`apps/server/lib/session.ts`)**
```ts
import { createHmac } from 'crypto';
export function pack(session:any, key:Buffer){
  const payload=Buffer.from(JSON.stringify(session)).toString('base64url');
  const mac=createHmac('sha256',key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
export function unpack(tok:string, key:Buffer){
  const [p,mac]=tok.split('.');
  const exp=createHmac('sha256',key).update(p).digest('base64url');
  if(exp!==mac) throw new Error('bad-mac');
  return JSON.parse(Buffer.from(p,'base64url').toString());
}
```

**Edge Cache Key**
```ts
// apps/web/src/middleware.ts
res.headers.set('Cache-Key', `${route}:${region}`);
```

**Client Revalidation**
```ts
// apps/web/src/lib/useRegionSWR.ts
import useSWR from 'swr';
export function useRegionData(key:string, region:'US'|'EU'){
  return useSWR([key,region], fetcher, { revalidateOnFocus:true });
}
```

### 3.4 Provenance Viewer UI
```tsx
// apps/web/src/app/provenance/page.tsx
export default function Provenance(){
  // fetch /api/provenance/chain?release=<sha>
  // render stages: build → sign → rekor → deploy → runtime verify
  return <div className="p-6 space-y-3">{/* chain cards */}</div>;
}
```

**API**
```ts
// /api/provenance/chain?release=...
// joins data from provmon datastore; runs quick verify (cosign+rekor) on demand
```

### 3.5 Audit Anomaly Detection
**Jobs (`ops/anomaly/rules.yaml`)**
```yaml
rules:
  - id: impossible-travel
    expr: subject.ip_region changes within 5m
  - id: admin-burst
    expr: count(action="admin") > p95*2 over 15m
  - id: export-spike
    expr: count(action~"export") > baseline*3 over 10m
```

**Runner (`ops/anomaly/run.ts`)**
```ts
// loads events window from audit shard; computes baselines and rules; emits alerts to event bus + Slack
```

**Actionable Alert (Slack)**
```json
{
  "title":"Anomaly: export-spike (EU)",
  "severity":"high",
  "window":"2025-12-05T10:00Z..10:10Z",
  "delta":"3.2x over baseline",
  "sampleTrace":"0f3a…",
  "playbook":"ops/runbooks/anomaly-export.md"
}
```

### 3.6 ABAC Mapper Presets & Validation
**Presets (`config/sso/presets/*.yaml`)**
```yaml
# okta.yaml
role: "${assertion.attributes.role}"
residency: "${assertion.attributes.region}"
classification_cap: "${assertion.attributes.clearance}"
```

**CI Harness**
```yaml
- name: ABAC presets test
  run: node scripts/test-abac.js config/sso/presets/*.yaml testvectors/sso/*.json
```

---

## 4) Test Strategy
- **Unit:** correlator; session pack/unpack; router partition; anomaly math.
- **Integration:** monitor end‑to‑end gap detection; region failover continuity; export manifest verify.
- **Security:** signature verification paths; session MAC integrity; cross‑region read gating.
- **Performance:** audit shard query p95 ≤300ms; Provenance Viewer load ≤1s warm; cache hit ≥80% under failover.

---

## 5) Acceptance Checklist (DoR → DoD)
- [ ] ProvMon alerts on simulated Rekor gap & runtime verify failure.
- [ ] Geo‑sharded audit writes/reads correct; exports include region + hash.
- [ ] Session continuity validated during failover; cache keys respect region.
- [ ] Provenance Viewer shows complete chain + quick verify.
- [ ] Anomaly rules detect seeded incidents; alerts delivered with playbook.
- [ ] ABAC presets validated; policy tests pass with mapped attributes.
- [ ] Evidence pack archived (reports, manifests, hashes, screenshots).

---

## 6) Risks & Mitigations
- **Cross‑region consistency expectations** → document eventual consistency; export‑only cross reads; queue replication.
- **Monitor noise** → debounce + severity routing; suppress during maintenance windows.
- **Anomaly false positives** → baseline warm‑up; require multi‑signal corroboration; tiered response.

---

## 7) Evidence Hooks
- **ProvMon report digest:** …  
- **EU/US shard counts:** …  
- **Failover continuity video:** …  
- **Provenance chain screenshot:** …  
- **Anomaly alert IDs:** …

---

## 8) Backlog Seed (Sprint 26)
- Real‑time replication with CDC + residency filters; anomaly feedback loop and suppression UI; per‑cohort canary scoring; structured export bundles with transparency attestations; provenance SLAs dashboard.

