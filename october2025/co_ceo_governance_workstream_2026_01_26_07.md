# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Jan 26–Feb 6, 2026 (Sprint 7; Q1 cadence)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, GTM enablement)  
**Theme:** Take **Attestation API to GA**, ship **Trust Portal v2.1** (white‑label packaging), automate **SLA/Compliance reports**, and integrate **3rd‑party attestations** into the evidence chain.

---

## 1) Sprint Goal
“Graduate the Attestation API to **GA with quotas, audit, and SLAs**, package the Trust Portal for partners, and expand provenance by ingesting **vendor attestations** and generating automated **customer‑ready reports** — all verifiable in packs and the portal.”

---

## 2) Objectives & Key Results (OKRs)
1) **Attestation API → GA** with ≥ 99.9% uptime SLO and p95 ≤ 300 ms.  
   *Measure:* SLO board green; error budget burn < 10%.
2) **Trust Portal v2.1 packaged** as a white‑label bundle.  
   *Measure:* `npm create trust-portal` scaffolds tenant in ≤5 min; two tenants deployed.
3) **3rd‑party attestation ingestion** (Sigstore/JSON claims) live.  
   *Measure:* Compliance Packs include `vendor_attestations.json`; portal shows vendor status.
4) **Automated SLA & Compliance reports** published per tag.  
   *Measure:* `sla-report.pdf` + `controls.json` embedded in pack; portal exposes download.
5) **SBOM diff & supply‑chain risk score** per release.  
   *Measure:* `sbom.diff.json` and `risk_score>=0` present; diff visualized in portal.

---

## 3) Deliverables (Definition of Done)
- **API GA hardening:** auth (API keys + optional mTLS), quotas, per‑tenant rate limits, audit logs (W3C), 429/503 backoff headers, OpenAPI v1.1, SDK stubs.
- **Portal v2.1**: white‑label packaging (`create-trust-portal`), tenant config validator, policy/brand presets, signature verify badge, SBOM diff view, vendor status chips.
- **Vendor Attestations Ingestion**: converter for CycloneDX/VEX, in‑toto/Sigstore bundles → normalized `vendor_attestations.json` with signature verification.
- **SLA/Compliance Report Generator**: CLI producing `sla-report.pdf` (latency, uptime, DR RPO/RTO, policy versions) and updating `controls.json` with coverage deltas.
- **SBOM Diff + Risk Scoring**: tool to compute dependency deltas and score (CVSS‑weighted + supply‑chain heuristics); gated in CI.
- **Runbooks**: API GA checklist, tenant packaging guide, vendor ingestion SOP.

---

## 4) Work Plan & Owners
| Date | Work Item | Owner | Exit Criteria |
|---|---|---|---|
| Jan 26 | API GA checklist & SLOs pinned | Co‑CEO + SRE | SLO doc merged; error budget policy set |
| Jan 27 | Rate limits + quotas + audit logs | DevEx | 200/429/503 flows verified; logs shipping |
| Jan 28 | White‑label packaging CLI | PM + DevEx | `npm create trust-portal` scaffolds and builds |
| Jan 29 | Vendor attestation converter + verify | SecOps | `vendor_attestations.json` produced and signed |
| Jan 30 | SBOM diff + risk score tool | SecOps | `sbom.diff.json` + `risk_score.json`; CI gate wired |
| Feb 3  | SLA/Compliance report generator | DevEx | `sla-report.pdf` attached to release |
| Feb 4  | Portal v2.1: SBOM diff + vendor chips | PM | UI renders data; badges accurate |
| Feb 5  | API GA canary + rollback test | SRE | Maestro run with canary→promote; rollback ready |
| Feb 6  | GA tag + demo + retro | Co‑CEO | All deliverables green; metrics posted |

---

## 5) Artifacts & Scaffolding

### 5.1 API GA Hardening — Gateway Patches
**Path:** `apis/attestation/server.js` (delta)
```js
import morgan from 'morgan';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
const perTenant = rateLimit({windowMs:60_000, max:(req)=>req.tenant?.quota||60, standardHeaders:true});
app.use(helmet());
app.use(morgan('combined'));
app.use((req,res,next)=>{ /* auth */ const key=req.get('X-API-Key'); /* look up tenant */ next(); });
app.use(perTenant);
app.set('trust proxy', true);
app.use((req,res,next)=>{ res.set('Retry-After','5'); next(); });
```

**OpenAPI v1.1** `apis/attestation/openapi.yaml` — add 429/503 responses, `Retry-After`, rate‑limit headers, and examples.

### 5.2 Portal Packaging CLI
**Path:** `tools/create-trust-portal/bin/index.js`
```js
#!/usr/bin/env node
import { execSync as sh } from 'node:child_process'
const name = process.argv[2]||'tenant-portal'
sh(`git clone --depth=1 https://github.com/yourorg/trust-portal-template ${name}`, {stdio:'inherit'})
console.log('Next: edit tenant.config.json and run npm install && npm run dev')
```

### 5.3 Vendor Attestation Ingestion
**Path:** `tools/vendor-ingest/ingest.js`
```js
#!/usr/bin/env node
import fs from 'fs'
const files = process.argv.slice(2)
const out = { items: [] }
for (const f of files){
  const raw = JSON.parse(fs.readFileSync(f,'utf8'))
  out.items.push({source:f, type:raw?.predicateType||'cyclonedx', sha256:'TODO', verified:true})
}
fs.writeFileSync('vendor_attestations.json', JSON.stringify(out,null,2))
```

**CI step:**
```yaml
  vendor_attestations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/vendor-ingest/ingest.js third_party/*.json
      - uses: actions/upload-artifact@v4
        with: { name: vendor_attestations, path: vendor_attestations.json }
```

### 5.4 SBOM Diff + Risk Score
**Path:** `tools/supplychain/sbom-diff.js`
```js
#!/usr/bin/env node
import fs from 'fs'
const a = JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
const b = JSON.parse(fs.readFileSync(process.argv[3],'utf8'))
const set = o => new Map(o.components.map(c=>[`${c.group||''}:${c.name}:${c.version}`, c]))
const A=set(a), B=set(b)
const added=[], removed=[], changed=[]
for (const k of B.keys()) if(!A.has(k)) added.push(k)
for (const k of A.keys()) if(!B.has(k)) removed.push(k)
for (const [k,c] of B.entries()) if(A.has(k) && JSON.stringify(A.get(k))!==JSON.stringify(c)) changed.push(k)
const risk = Math.min(100, added.length*3 + removed.length + changed.length*2)
const out = { added, removed, changed, risk_score:risk }
fs.writeFileSync('sbom.diff.json', JSON.stringify(out,null,2))
```

**CI gate:** fail if `risk_score>70` unless Decision override.

### 5.5 SLA/Compliance Report Generator
**Path:** `tools/reports/sla-report.mjs`
```js
import fs from 'fs'
const m = JSON.parse(fs.readFileSync('evidence/dr_metrics.json','utf8'))
const pack = JSON.parse(fs.readFileSync('policy.json','utf8'))
const md = `# SLA Report — ${process.env.GITHUB_REF_NAME}\n\n- RPO: ${m.rpo}s\n- RTO: ${m.rto}s\n- Policy: ${pack.policy_version} (${pack.policy_sha256})\n`
fs.writeFileSync('sla-report.md', md)
```

**CI to PDF:**
```yaml
  sla_report:
    needs: [compliance]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/reports/sla-report.mjs
      - run: npx md-to-pdf sla-report.md
      - uses: actions/upload-artifact@v4
        with: { name: sla-report, path: sla-report.pdf }
```

### 5.6 Portal v2.1 UI — SBOM Diff & Vendor Chips (excerpt)
**Path:** `tools/trust-portal/components/EvidenceRow.tsx`
```tsx
export function EvidenceRow({diff, vendor}:{diff:{risk_score:number}, vendor:{items:any[]}}){
  return <div className="grid gap-2 p-4 rounded-2xl shadow">
    <div>Risk score: <strong>{diff.risk_score}</strong></div>
    <div className="flex gap-2">{vendor.items.map(v=>
      <span key={v.source} className={`px-2 py-1 rounded ${v.verified?'bg-green-100':'bg-red-100'}`}>{v.type}</span>
    )}</div>
  </div>
}
```

---

## 6) Dashboards & Alerts
- **API SLOs:** uptime ≥ 99.9%, p95 ≤ 300 ms (alert on breach, burn‑down chart).  
- **Pack completeness:** vendor attestations + SBOM diff + SLA report present (target 100%).  
- **Risk score budget:** alert if `risk_score>70`.  
- **Portal packaging success:** CLI scaffold success rate ≥ 95% (CI telemetry).

---

## 7) Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Rate‑limit misconfig blocks partners | Med | Med | Tenant QA + staged quotas + canary |
| Vendor formats vary widely | Med | Med | Normalization adapters + fallback to raw attach |
| SBOM diff false positives | Low | Med | Component key canonicalization; allowlist for known changes |
| PDF generation flakiness | Low | Low | Cache fonts; retry 3x; store MD as backup |

---

## 8) Alignment Notes
- Builds on Sprint 6 (Portal v2 + Attestation API v1, controls mapping, budget gates).  
- Sets up Sprint 8: **Auditor pilot**, pricing guardrails, and partner developer docs.

---

## 9) Exit Checklist
- GA tag cut for Attestation API; SLO board green.  
- Portal v2.1 packaged and deployed for 2 tenants.  
- Compliance Packs include vendor attestations, SBOM diff, risk score, and SLA report.  
- CI gates pass or Decision overrides recorded; portal visualizes all indicators.  
- Demo complete; metrics posted; risks updated.

