# Architect-General — Switchboard Step-Up, Audit, DLP

**Workstream:** Switchboard Platform Hardening (AuthN/AuthZ, Audit, Data Governance)  
**Sprint Window:** 2025-10-20 → 2025-10-31 (10 biz days)  
**Ordinal:** Sprint 22 (Q4’25 cadence alignment)  
**Prime Objective:** Elevate Switchboard from “secure-by-default” to **“provable & governed”**: WebAuthn step‑up, audit trail with lineage, data residency guardrails, redaction at source, and performance budgets. Align with **IntelGraph** eventing and **Maestro Conductor (MC)** action semantics.

---

## 0) Executive Summary & Commitments

- **Track A (Now‑value):**
  - **WebAuthn Step‑Up** flow integrated into protected actions (render sensitive widgets, meeting token minting, admin).
  - **Audit Trail v0.1** (append‑only, exportable, queryable): policy decisions, step‑up events, admin actions.
  - **Residency & Classification Enforcement** in UI + API, with user‑facing map and actionable errors.
  - **Source‑side Redaction** library to drop/blur PII in logs/events/metrics.
  - **Performance & DAST Gates:** k6 perf budget, OWASP ZAP nightly with allow‑listed findings.
- **Track B (Moat):**
  - **Event Contracts** for IntelGraph/MC (NATS subjects, message schema, provenance headers).
  - **Compliance Evidence Automation:** periodic SBOM drift check, attestation verification cron, audit snapshot exporter.

**Definition of Done:**
- All protected actions require step‑up within a freshness window; audit events are emitted, stored, and exportable; UI shows residency/label guards; perf/DAST gates passing; evidence archived.

---

## 1) Context & Dependencies
- **Preceding Sprint (21):** Signed builds, SBOMs, canary + rollback, SLOs, OPA v0.2.
- **This Sprint Focus:** Auth flows, audit fabric, data controls, performance/security tests, event contracts.
- **External Alignment:**
  - IntelGraph providing **Agent/Signal** events over NATS (or stub) with provenance metadata.
  - MC providing **Action Dispatch** contract; Switchboard enforces ABAC + step‑up on dispatch.

---

## 2) Objectives & Key Results

**OBJ‑1: Step‑Up Authentication (WebAuthn) for Sensitive Operations**  
- **KR1.1** UI step‑up modal with device register+assert; backend verifies; 5‑minute freshness TTL.  
- **KR1.2** Policy hook: actions classified ≥`confidential` require `step_up=true` or within TTL.  
- **KR1.3** Audit events for register, assert, and failures.

**OBJ‑2: Audit Trail v0.1 (Provable Decisions)**  
- **KR2.1** Append‑only store (SQLite/Postgres, `audit_events` table) + signer digest chain.  
- **KR2.2** Export endpoints: `/audit/stream`, `/audit/export` (NDJSON + SHA256 manifest).  
- **KR2.3** Viewer page with filters (subject, action, decision, traceId, time range).  

**OBJ‑3: Residency + Classification Guardrails**  
- **KR3.1** Residency map UI (US/EU) reads from policy context; prevents action with actionable copy.  
- **KR3.2** API validates `resource.residency` vs `context.region`; emits structured error with remediation.  
- **KR3.3** OPA v0.3: explicit deny codes + localization keys.

**OBJ‑4: Source‑Side Redaction & PII Minimization**  
- **KR4.1** Redaction middleware for logs/metrics/events (regex + schema‑aware).  
- **KR4.2** Telemetry contract forbids PII fields; linter/enforcer in CI.  
- **KR4.3** DLP unit tests and sample fixtures.

**OBJ‑5: Performance & Security Gates**  
- **KR5.1** k6 smoke and load profiles with p95≤300ms, p99≤600ms caps; CI budget check.  
- **KR5.2** ZAP passive+active scan nightly; SARIF upload; budgeted allow‑list with expiry.  
- **KR5.3** Synthetic probes extended: step‑up required path.

**OBJ‑6: Evidence Automation**  
- **KR6.1** Scheduled SBOM drift compare vs last release; open issue on regressions.  
- **KR6.2** Attestation verification cron + Slack summary.  
- **KR6.3** Weekly audit snapshot (signed manifest) stored in `evidence/`.

---

## 3) Work Breakdown & Owners

| # | Epic | Issue | Owner | Acceptance | Evidence |
|---|------|-------|-------|------------|----------|
| A | Auth | WebAuthn register/assert + TTL | AppEng | Step‑up enforced on sensitive routes | Cypress e2e, manual runbook |
| B | Policy | OPA v0.3 with deny codes | SecEng | 95% policy tests coverage | `opa test` summary |
| C | Audit | Append‑only store + exporter | DataEng | Tamper‑evident digest chain | Export hash, verify script |
| D | UI | Residency map & guardrails | FE | Correct user messaging, blocked flows | Storybook + integration tests |
| E | DLP | Redaction middleware + CI linter | SecEng | No PII in logs/events | Linter pass + samples |
| F | Perf | k6 profiles + CI budget | SRE | Gate fails over budget | CI artifacts + trend chart |
| G | DAST | ZAP nightly + triage workflow | SecEng | SARIF in Security tab, budget | Issues auto‑created |
| H | Evidence | SBOM/attest cron + snapshot | ProdOps | Weekly artifacts pushed | `evidence/` tree + checksums |

---

## 4) Implementation Artifacts (Drop‑in)

### 4.1 WebAuthn Step‑Up (UI + API)
**UI Modal (`apps/web/src/components/StepUpModal.tsx`)**
```tsx
'use client';
import { useState } from 'react';
export default function StepUpModal({ onVerified }:{ onVerified:()=>void }){
  const [busy,setBusy]=useState(false);
  async function doStepUp(){
    setBusy(true);
    const chal = await fetch('/api/auth/webauthn/challenge').then(r=>r.json());
    const cred = await navigator.credentials.create({ publicKey: chal });
    const ok = await fetch('/api/auth/webauthn/verify',{
      method:'POST', body: JSON.stringify(cred), headers:{'content-type':'application/json'}
    }).then(r=>r.ok);
    setBusy(false);
    if(ok) onVerified();
  }
  return (
    <div className="p-4 rounded-2xl shadow bg-white space-y-2">
      <h3 className="text-lg font-semibold">Step‑Up Required</h3>
      <p>Confirm with your security key or platform authenticator.</p>
      <button disabled={busy} onClick={doStepUp} className="px-3 py-2 rounded-2xl shadow">Verify</button>
    </div>
  );
}
```

**API Routes (pseudo, Node/Next) — freshness TTL**
```ts
// /api/auth/webauthn/challenge
export async function GET(){ /* return PublicKeyCredentialCreationOptions / RequestOptions */ }
// /api/auth/webauthn/verify
export async function POST(req:Request){
  // verify assertion, then set server session flag:
  // session.stepUp = { ts: Date.now(), method: 'webauthn' }
}
// helper
export function hasFreshStepUp(session, ttlMs=5*60*1000){
  return session?.stepUp?.ts && (Date.now() - session.stepUp.ts) < ttlMs;
}
```

**Route Guard Example**
```ts
import { hasFreshStepUp } from '@/lib/stepup';
export async function POST(req:Request){
  const session = await getSession();
  if(!hasFreshStepUp(session)) return new Response('step_up_required', { status: 428 });
  // proceed
}
```

### 4.2 Policy Pack v0.3 — Deny Codes & Step‑Up TTL (`policies/switchboard_v0_3.rego`)
```rego
package switchboard

import future.keywords.if

default allow := false

allow if {
  input.subject.authenticated
  input.subject.role in {"admin","operator","analyst"}
  not deny[_]
}

deny[{"code":"RESIDENCY","msg":"residency_mismatch"}] if {
  input.resource.residency in {"EU","US"}
  input.context.region != input.resource.residency
}

deny[{"code":"CLASSIFICATION","msg":"step_up_required"}] if {
  input.resource.classification >= 2
  not input.subject.step_up
}

deny[{"code":"STEPUP_EXPIRED","msg":"step_up_stale"}] if {
  input.subject.step_up
  input.subject.step_up_age_ms > 300000 # 5 minutes
}
```

**Tests (`policies/tests/v0_3_test.rego`)**
```rego
package switchboard_test

# fresh step-up should allow confidential action
fresh_stepup_allows {
  inp := {"subject": {"authenticated": true, "role":"analyst", "step_up": true, "step_up_age_ms": 2000},
          "resource": {"classification": 2}, "context": {"region":"US"}}
  switchboard.allow with input as inp
}

# expired step-up should deny
expired_stepup_denies {
  inp := {"subject": {"authenticated": true, "role":"analyst", "step_up": true, "step_up_age_ms": 900000},
          "resource": {"classification": 2}, "context": {"region":"US"}}
  deny := data.switchboard.deny with input as inp
  any := count(deny) > 0
}
```

### 4.3 Audit Trail v0.1
**Schema (`db/migrations/20251020_audit.sql`)**
```sql
create table if not exists audit_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  trace_id text,
  subject jsonb not null,
  action text not null,
  decision text not null,
  resource jsonb,
  context jsonb,
  deny jsonb,
  sig_prev bytea,
  sig_curr bytea
);
create index on audit_events (ts);
```

**Appender (Node)**
```ts
import { createHash } from 'crypto';
let lastDigest = Buffer.alloc(0);
export async function appendAudit(ev:any, db:any){
  const h = createHash('sha256').update(Buffer.concat([
    lastDigest, Buffer.from(JSON.stringify(ev))
  ])).digest();
  await db.insert('audit_events',{...ev, sig_prev:lastDigest, sig_curr:h});
  lastDigest = h;
}
```

**Exporter (`/api/audit/export`)**
```ts
// Streams NDJSON and writes manifest { count, sha256, started, ended }
```

### 4.4 Residency Map UI
```tsx
// apps/web/src/components/ResidencyGuard.tsx
export function ResidencyGuard({ residency, region, children }:{residency:'US'|'EU', region:string, children:React.ReactNode}){
  if(residency!==region){
    return <div className="p-3 rounded-2xl bg-yellow-50">This data is restricted to {residency}. Switch your region or request access.</div>;
  }
  return <>{children}</>;
}
```

### 4.5 Redaction Middleware & Telemetry Linter
**Runtime Redactor (`apps/shared/redact.ts`)**
```ts
const patterns = [
  { k:/email/i, v:/.+@.+/ },
  { k:/ssn|sin/i, v:/\b\d{3}-?\d{2}-?\d{4}\b/ },
  { k:/phone/i, v:/\+?[0-9][0-9\-\.\(\)\s]{7,}/ }
];
export function redact(obj:any){
  const o = JSON.parse(JSON.stringify(obj));
  for(const [k,v] of Object.entries(o)){
    for(const p of patterns){
      if(p.k.test(k) || (typeof v==='string' && p.v.test(v as string))){ o[k] = '[REDACTED]'; }
    }
  }
  return o;
}
```

**Log Wrapper**
```ts
export function logJSON(entry:any){
  console.log(JSON.stringify(redact(entry)));
}
```

**CI Linter (`scripts/telemetry-lint.js`)**
```js
const fs=require('fs');
const BAD=['email','ssn','sin','phone','address'];
const files=process.argv.slice(2);
let bad=0;
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  for(const b of BAD){ if(t.match(new RegExp(b,'i'))){ console.error(`PII token '${b}' in ${f}`); bad++; }}
}
process.exit(bad?1:0);
```

**Action Step**
```yaml
- name: Telemetry PII Lint
  run: node scripts/telemetry-lint.js $(git ls-files "apps/**/*.ts*" "packages/**/*.ts*")
```

### 4.6 Performance & DAST Gates
**k6 Profile (`perf/k6/smoke.js`)**
```js
import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = { thresholds: { http_req_duration: ['p(95)<300','p(99)<600'] }, vus: 10, duration: '3m' };
export default function(){
  const r = http.get(`${__ENV.BASE_URL}/`);
  check(r, { 'status 200': (res)=> res.status===200 });
  sleep(1);
}
```

**GitHub Action**
```yaml
- name: k6 perf budget
  uses: grafana/k6-action@v0
  with:
    filename: perf/k6/smoke.js
  env:
    BASE_URL: ${{ steps.deploy.outputs.preview_url }}
```

**ZAP Nightly (`.github/workflows/zap.yml`)**
```yaml
name: zap-nightly
on:
  schedule: [{ cron: '0 7 * * *' }]
jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ZAP Baseline
        uses: zaproxy/action-baseline@v0.12.0
        with: { target: ${{ secrets.ZAP_TARGET }}, rules_file_name: '.zap/rules.tsv' }
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: results.sarif }
```

### 4.7 Event Contracts (IntelGraph / MC)
**Headers**
```
x-trace-id, x-provenance-sha256, x-policy-decision, x-step-up-method, x-step-up-age-ms
```

**NATS Subjects (convention)**
```
intelgraph.signals.v1.*
mc.actions.v1.dispatch
switchboard.audit.v1.append
```

**Message Schema (JSON) `contracts/events.schema.json` (excerpt)**
```json
{
  "$id": "https://companyos/contracts/events.schema.json",
  "type": "object",
  "properties": {
    "traceId": {"type":"string"},
    "ts": {"type":"string","format":"date-time"},
    "subject": {"type":"object"},
    "action": {"type":"string"},
    "resource": {"type":"object"},
    "decision": {"type":"string","enum":["allow","deny","stepup"]}
  },
  "required":["traceId","ts","action","decision"]
}
```

### 4.8 Evidence Automation
**Weekly SBOM Drift (`.github/workflows/sbom-drift.yml`)**
```yaml
name: sbom-drift
on:
  schedule: [{ cron: '0 6 * * 1' }]
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anchore/sbom-action@v0
        with: { path: '.', format: cyclonedx-json, output-file: current.cdx.json }
      - name: Compare
        run: node scripts/compare-sbom.js releases/latest/sbom.cdx.json current.cdx.json
```

**Attestation Verify Cron (`.github/workflows/attest-verify.yml`)**
```yaml
name: attest-verify
on:
  schedule: [{ cron: '0 6 * * 2' }]
jobs:
  verify:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - run: cosign verify-attestation --type slsa.provenance $IMAGE
```

### 4.9 Runbooks & Docs
**`ops/runbooks/step-up.md`**
```md
# Step‑Up Troubleshooting
- Symptom: 428 step_up_required → Ask user to complete WebAuthn.
- Check: `/api/auth/status` shows step_up_age_ms.
- Remediate: Clear session, re‑register credential.
```

**`docs/adr/021-webauthn-stepup.md`**
```md
# ADR 021: WebAuthn Step‑Up
Status: Accepted
Decision: WebAuthn for sensitive actions with 5‑minute freshness TTL; policy enforcement in OPA v0.3; audit emission for all events.
```

**Release Notes Template Addendum**
```md
## Compliance Evidence
- Audit snapshot: evidence/audit_YYYYMMDD.ndjson + manifest.json
- SBOM drift report: evidence/sbom-drift-YYYYMMDD.json
- Attestation verify: evidence/attest-verify-YYYYMMDD.txt
```

---

## 5) Testing Strategy
- **Unit:** Policy tests ≥95%; redaction functions; step‑up helpers.
- **Integration:** WebAuthn e2e (Cypress); audit append‑verify chain; residency guard UI.
- **Security:** ZAP nightly; dependency scans continue; telemetry PII linter.
- **Performance:** k6 thresholds baked into CI; trend line recorded per commit.

---

## 6) Acceptance Checklist (DoR → DoD)
- [ ] ADR accepted (step‑up, audit, redaction).
- [ ] Policy v0.3 merged; tests green.
- [ ] Step‑up enforced and freshness TTL honored.
- [ ] Audit events stored, exported, and verified (hash chain).
- [ ] Residency guard shown correctly; API returns deny codes.
- [ ] DLP redaction on by default in logs/events.
- [ ] k6 gate passing; ZAP issues triaged.
- [ ] Evidence artifacts generated and archived.

---

## 7) Risk Register & Mitigation
- **WebAuthn device diversity** → Provide platform + cross‑platform guidance; fallback TOTP (non‑privileged paths only).
- **Audit volume/cost** → Sampling for low‑risk allow events; full capture for deny/step‑up/admin.
- **False‑positive DLP** → Scoped redaction to structured fields; include opt‑in allow‑list for service owners.

---

## 8) Backlog Seed (Sprint 23)
- Audit Viewer advanced filters + export UI; DLP dictionary + entropy detector; residency multi‑region routing; policy bundles signed & verified at startup; DR game‑day automation; perf budgets per page; SSO federation attestations.

---

## 9) Evidence Hooks (to fill during sprint)
- **Release SHA:** …
- **Attestation verify log:** …
- **Audit export manifest digest:** …
- **k6 report link:** …
- **ZAP SARIF:** …

