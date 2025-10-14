# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Feb 23–Mar 6, 2026 (Sprint 9; Q1 cadence)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, GTM enablement)  
**Theme:** **Close the loop** from auditor pilot → remediation, ship **SLSA L3 trajectory**, make **SDKs GA**, and wire **billing/entitlements** to attestation signals.

---

## 1) Sprint Goal
“Turn auditor feedback into green checks, level up supply‑chain hardening, graduate SDKs to GA with samples & tests, and connect pricing/entitlements to verified evidence so value and governance stay in lockstep.”

---

## 2) Objectives & Key Results (OKRs)
1) **Auditor findings resolved ≤ 3** and tracked to closure.  
   *Measure:* All findings mapped to Decisions with owners/dates; portal shows "Remediated".
2) **SLSA L3 readiness** (build provenance + isolated builders) documented and partially implemented.  
   *Measure:* Provenance includes builder isolation claim; threat model signed.
3) **SDKs (Node/Python) → GA** with tests, versioning, and semver governance.  
   *Measure:* v1.0.0 published; quickstart ≤ 5 minutes.
4) **Billing/Entitlements bound to attestation** across portal/API.  
   *Measure:* Entitlement service enforces plan features based on verified evidence; audit trail emitted.
5) **Mean time to Disclosure Pack ≤ 10 min** from tag cut.  
   *Measure:* CI timing panel shows median ≤ 10 min.

---

## 3) Deliverables (Definition of Done)
- **Findings Remediation Pack**: `auditor/findings.json` + changes; linked in Compliance Pack.
- **SLSA L3 Plan**: doc + CI deltas (OIDC, hermetic build sketch, provenance subjects); canary job with isolated runner.
- **SDKs GA**: typed clients, cosign verify util (server assist where needed), tests, examples repo, version policy.
- **Entitlements Service**: lightweight service evaluating plan + evidence signals (policy hash, signature verified) → feature flags.
- **Portal+API**: display entitlement state, enforce usage gates; export billing audit log.
- **CI Time Budgeting**: measure & optimize pack generation time; cache steps.

---

## 4) Work Plan & Owners
| Date | Work Item | Owner | Exit Criteria |
|---|---|---|---|
| Feb 23 | Findings triage → Decision log | Co‑CEO | `auditor/findings.json` mapped to Decisions |
| Feb 24 | SLSA L3 plan + builder isolation POC | SecOps + DevEx | Isolated runner job green; doc committed |
| Feb 25 | SDKs harden: tests + error handling | DevEx | 90%+ cov; pre‑release tags |
| Feb 26 | GA publish & examples repo | DevEx | npm/PyPI v1.0.0; examples pass CI |
| Feb 27 | Entitlements service scaffold + pricing policy | PM + Co‑CEO | Policy rules in place; feature flags wired |
| Mar 3  | Portal/API entitlement wiring + audit log | DevEx | 200/403 flows; audit entries visible |
| Mar 4  | CI perf pass (≤10 min to pack) | DevEx | Workflow time reduced & charted |
| Mar 6  | Demo + retro + next sprint seeds | Co‑CEO | OKRs measured; risks updated |

---

## 5) Artifacts & Scaffolding

### 5.1 Auditor Findings → Decisions
**Path:** `auditor/findings.json`
```json
[
  {"id":"A-001","title":"Tighten cosign verification issuer","severity":"med","owner":"SecOps","due":"2026-03-05","decision_id":"DEC-123"},
  {"id":"A-002","title":"Add SBOM diff allowlist","severity":"low","owner":"DevEx","due":"2026-03-03","decision_id":"DEC-124"}
]
```

**Portal badge mapping:** green when all `due` ≤ today have status `closed`.

---

### 5.2 SLSA L3 Trajectory — CI Delta (POC)
**Path:** `.github/workflows/release.isolated.yml`
```yaml
name: release.isolated
on: { workflow_dispatch: {} }
permissions: { contents: write, id-token: write, attestations: write }
jobs:
  build_hermetic:
    runs-on: [self-hosted, isolated]
    container: { image: node:20-alpine }
    steps:
      - uses: actions/checkout@v4
      - name: Disallow network
        run: echo 0 > /proc/sys/net/ipv4/ip_forward || true
      - run: corepack enable && pnpm i --frozen-lockfile --offline
      - run: pnpm build
      - name: Generate provenance (subjects pinned)
        uses: slsa-framework/slsa-github-generator@v2.0.0
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
          
```

**Threat model sketch** `security/slsa-l3-plan.md` describing builder isolation, OIDC, pinned dependencies, hermeticity constraints.

---

### 5.3 SDKs GA — Node & Python
**Node** `sdk/node/src/index.ts`
```ts
export type VerifyResult = { verified:boolean; sha256:string };
export async function verifyPack(packUrl:string, sigUrl:string):Promise<VerifyResult>{
  // Server-assisted verify call
  const res = await fetch(`/api/verify?pack=${encodeURIComponent(packUrl)}&sig=${encodeURIComponent(sigUrl)}`);
  if(!res.ok) throw new Error(`verify failed: ${res.status}`);
  return res.json();
}
export async function getControls(tag:string){
  const r = await fetch(`/controls?tag=${encodeURIComponent(tag)}`);
  if(!r.ok) throw new Error('controls fetch failed');
  return r.json();
}
```

**Python** `sdk/python/topicality_attest/client.py`
```python
import requests
class AttestationClient:
    def __init__(self, base_url: str):
        self.base = base_url.rstrip('/')
    def verify_pack(self, pack_url: str, sig_url: str) -> dict:
        r = requests.get(f"{self.base}/api/verify", params={"pack": pack_url, "sig": sig_url}, timeout=30)
        r.raise_for_status()
        return r.json()
    def controls(self, tag: str) -> dict:
        r = requests.get(f"{self.base}/controls", params={"tag": tag}, timeout=15)
        r.raise_for_status(); return r.json()
```

**Version policy** `sdk/VERSIONING.md` (semver rules, support windows, deprecation policy).

---

### 5.4 Entitlements Service
**Path:** `services/entitlements/server.mjs`
```js
import express from 'express'
import morgan from 'morgan'
import { createVerifier } from './verify.js' // wraps cosign verify
import policy from './pricing_policy.js'
const app = express(); app.use(morgan('combined'))
app.get('/feature/:name', async (req,res)=>{
  const plan = req.get('X-Plan')||'Starter'
  const ev = { sig: req.get('X-Pack-Sig')||'', hash: req.get('X-Pack-Hash')||'' }
  const verified = await createVerifier().verify(ev)
  const allowed = policy.allow(plan, req.params.name, verified)
  res.json({plan, feature:req.params.name, allowed, verified})
})
app.listen(8081)
```

**Policy** `services/entitlements/pricing_policy.js`
```js
export default { allow(plan, feature, verified){
  const matrix = { Starter:{vendor:false}, Pro:{vendor:true}, Enterprise:{vendor:true, auditor:true} }
  const needsVerified = feature==='vendor' || feature==='auditor'
  return (matrix[plan]?.[feature]??false) && (!needsVerified || verified)
}}
```

**Gateway hook:** check `/feature/<name>` before exposing vendor attestations or auditor tenant links.

---

### 5.5 CI Time Budgeting — Measure & Optimize
**Path:** `.github/actions/ci-timer/action.yml`
```yaml
name: 'CI Timer'
runs: { using: 'composite', steps: [{ shell:'bash', run:'echo $(date +%s) > .timer.start' }] }
```

**Usage:** add at job start and end; compute delta and push to `metrics/ci_times.json`; show in dashboard.

---

## 6) Dashboards & Alerts (adds)
- **Findings burn‑down**: remaining vs due date (alert on overdue).  
- **SLSA readiness**: isolated job state + provenance subjects present.  
- **SDK GA health**: downloads, error rate, quickstart success.  
- **Entitlements decisions**: allowed/denied counts; anomalies flagged.  
- **Pack generation time**: median ≤ 10 min (alert > 12 min).

---

## 7) Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Isolated runners scarce | Med | Med | Time-boxed POC; fallback to shared with constraints |
| SDK verify UX rough | Med | Med | Server-assisted verify; wasm P2 |
| Entitlement false negatives | Low | Med | Shadow mode logs first; enable after 3 days |
| CI time regressions | Med | Low | Cache dependencies; parallelize verify steps |

---

## 8) Alignment Notes
- Builds on Sprint 8 (auditor pilot, Dev Center, pricing guardrails).  
- Sets up Sprint 10 (Mar 9–Mar 20): **Auditor sign‑off package**, customer contracts (DPA/DPIA), and Q1 board brief evidence pack.

---

## 9) Exit Checklist
- All auditor findings closed or accepted with rationale.  
- SLSA L3 plan committed; isolated job demo green.  
- SDKs v1.0.0 released with tests & examples.  
- Entitlements service gating features based on verified evidence; audit logs live.  
- Pack generation median time ≤ 10 min; dashboard panel updated.

