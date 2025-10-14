# Guy • IntelGraph Platform Workstream — **Mobile Attachments (DLP), MDM Posture, ER Rule‑Assist & Influence Motifs** (Sprint 09)
**Slug:** `guy-intelgraph-platform-mobile-attachments-mdm-er-rules-2026-02-02-sprint-09`  
**Window:** Feb 2–Feb 13, 2026 (10 biz days)  
**Cadence alignment:** Company Sprint 26 (Q1’26). Builds on S08 (Mobile write, geo motifs, mTLS/device posture).  
**Repo base:** `summit-main/` (apps/web, server, er-service, prov-ledger, graph-xai, helm, terraform).  

---

## 0) Continuity & Strategic Delta
**Shipped up to S08:** Mobile write ops (offline queue + CRDT‑lite), geo‑temporal motifs pack, mTLS everywhere, device posture gate, ER batch UX + cache tiering.  
**New focus:** add **mobile attachments** with **DLP** checks, integrate **MDM attestation** for stronger device posture, enhance ER with **rule‑assisted merging** for very high confidence cohorts, and ship **influence diffusion motifs** (Kemeny/absorbing Markov heuristics) with explanations. Harden zero‑trust to the **edge** (ingress mTLS) and extend observability.

---

## 1) Sprint Goal
Deliver **secure mobile attachments**, **MDM‑verified posture**, **ER rule‑assist**, and **influence motifs v1**; extend zero‑trust to edge and keep SLOs green under mixed (mobile + desktop) load.

**Victory Conditions**
- Mobile can capture/upload images (and small docs) with **client‑side and server‑side DLP**; blocked items explain “why”.
- **MDM posture** (device attestation token) required for mobile uploads; OPA enforces; all access recorded to provenance.
- **ER Rule‑Assist** surfaces ≥ 30% of merges as auto‑approve candidates at **≥0.97 precision** (human confirm default); downgrade to queue if policy blocks.
- **Influence motifs v1** (diffusion reach, bridge risk, influence paths) compute on demo in < 2.5s; overlays toggle < 300ms; explain cards show math in plain language.
- Zero‑trust edge: **ingress mTLS** enabled with rotation; failure drill documented.

---

## 2) Backlog (Stories → Acceptance)
### A. Mobile Attachments + DLP
1. **Capture & Upload** (`apps/web/src/mobile/Attach.tsx`)  
   *AC:* Camera & file picker; progress, retry; offline enqueue; EXIF stripped (configurable); provenance stores hash, size, mime, device.
2. **Client‑side DLP** (`apps/web/src/mobile/dlp.ts`)  
   *AC:* Simple patterns (email/phone/SSN) + image OOB text detector; warn/block pre‑upload; override reason captured.
3. **Server DLP Pipeline** (`server/src/dlp/*`)  
   *AC:* OCR (pluggable), regex & keyword rules, size/type limits; policy‑enforced quarantine; explicit rationales; audit to prov‑ledger.

### B. Device Posture (MDM)
4. **MDM Attestation** (`server/src/security/mdm.ts`, OPA `device_mdm.rego`)  
   *AC:* Validate MDM token (JWT/JWS); claims: device id, OS/ver, compliance; OPA gate for privileged ops (uploads, case writes).
5. **Edge mTLS** (`ops/ingress/mtls/*`)  
   *AC:* Ingress terminates/forwards mTLS; cert rotation via Jobs; health checks; rollback plan.

### C. ER Rule‑Assisted Merging
6. **Cohort Rules Engine** (`server/src/er/rules/*.yaml`, `server/src/er/apply_rules.ts`)  
   *AC:* YAML rules for deterministic matches (email exact, gov id match, strong multi‑feature combos); produce auto‑approve candidates with explain‑why.
7. **Guarded Auto‑Approve Flow** (`apps/web/src/features/er-queue/auto.tsx`)  
   *AC:* Separate “Auto‑approve” lane; confirm‑to‑merge UI; policy checks; provenance tags rule id + thresholds.

### D. Influence Motifs v1
8. **Diffusion Reach** (`server/src/analytics/motifs/influence_diffusion.ts`)  
   *AC:* Approximate influence (power iteration / absorbing states); configurable damping; returns top‑k influencers and reach sets + “why”.
9. **Influence Paths** (`server/src/analytics/motifs/influence_paths.ts`)  
   *AC:* K shortest simple paths constrained by time/edge types; overlay chips; explain path significance.
10. **Explain Cards** (`apps/web/src/features/tri-pane/influence-cards.tsx`)  
    *AC:* Show scores, paths, and plain‑English explanation; link to motif docs.

### E. Observability & Docs
11. **Edge mTLS Panels** (`helm/observability/dashboards/edge.json`)  
    *AC:* Handshake errors, cert age, rotation status, client DN stats; alerts.
12. **DLP Metrics** (`server/src/metrics/dlp.ts`)  
    *AC:* Blocks/warns/overrides; types; OCR timings; bytes scanned.
13. **Playbooks & Threat Model Deltas** (`SECURITY/playbooks/*`, `SECURITY/threat-model.md`)  
    *AC:* mTLS rotation drill, DLP incident response; update STRIDE with mobile uploads surface.

---

## 3) Jira Subtasks CSV (import‑ready)
```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Mobile Capture & Upload,"Camera/picker, progress, offline queue, EXIF stripping, provenance.",High,mobile,web,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-03,IG-<parent>
Sub-task,IG,Client DLP,"Regex + simple OCR hooks pre-upload with override reason.",High,security,web,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-04,IG-<parent>
Sub-task,IG,Server DLP,"OCR pipeline, rules, quarantine, provenance rationales.",High,security,server,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-06,IG-<parent>
Sub-task,IG,MDM Attestation,"Validate MDM token; OPA device gate.",High,security,server,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-05,IG-<parent>
Sub-task,IG,Edge mTLS,"Ingress mTLS with rotation + rollback plan.",High,security,ops,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-07,IG-<parent>
Sub-task,IG,ER Rules Engine,"YAML rules → auto-approve candidates with explain-why.",High,er,server,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-08,IG-<parent>
Sub-task,IG,Auto-Approve Lane,"Confirm-to-merge UI; policy checks; provenance tags.",High,er,web,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-10,IG-<parent>
Sub-task,IG,Diffusion Reach,"Top-k influencers + reach sets + damping.",High,analytics,server,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-11,IG-<parent>
Sub-task,IG,Influence Paths,"K shortest time-bounded paths + explains.",High,analytics,server;web,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-12,IG-<parent>
Sub-task,IG,Edge mTLS Panels,"Handshake errors, cert age, rotations.",Medium,telemetry,ops,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-08,IG-<parent>
Sub-task,IG,DLP Metrics,"Blocks/warns/overrides; OCR time; bytes.",Medium,telemetry,server,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-06,IG-<parent>
Sub-task,IG,Security Playbooks,"mTLS rotation drill; DLP incident response; STRIDE delta.",Medium,security,ops,,guy@intelgraph.dev,2026.02.r1,"Sprint 26 (Feb 2–13, 2026)",2026-02-09,IG-<parent>
```

---

## 4) Branching Plan
- Branch: `feature/mobile-attachments-mdm-er-rules-influence`
- Integration branches: `feat/mobile-attach`, `feat/dlp-client`, `feat/dlp-server`, `feat/mdm-attest`, `feat/edge-mtls`, `feat/er-rules`, `feat/er-auto-lane`, `feat/motif-influence-diffusion`, `feat/motif-influence-paths`, `feat/edge-panels`, `feat/dlp-metrics`, `feat/sec-playbooks`.

---

## 5) Architecture Delta (ASCII)
```text
Mobile PWA
  ├─ Attachments (camera/picker) → Client DLP → Offline Queue → Sync
  └─ Device Posture (MDM token)
      │                     │
      ▼                     ▼
Server (Edge mTLS)  ←  Ingress
  ├─ security/mdm (verify) + OPA device_mdm.rego
  ├─ dlp pipeline (ocr, rules, quarantine)
  ├─ er/rules (auto-approve candidates) + UI lane
  └─ analytics/motifs (influence_diffusion, influence_paths)
      │
      ▼
Prov‑Ledger (attachments hash, DLP rationale, MDM claims, rule ids)
Observability: edge mTLS panels, DLP metrics; Docs: playbooks + STRIDE delta
```

---

## 6) Code Scaffolding (drop‑in files)
### 6.1 Mobile Attachments (web)
```tsx
// apps/web/src/mobile/Attach.tsx
import React, { useState } from 'react';
import { runClientDlp } from './dlp';
import { enqueue } from './offline-queue';
export default function Attach({ deviceId }:{ deviceId:string }){
  const [file,setFile] = useState<File|null>(null);
  const [err,setErr] = useState<string>('');
  async function onChange(e:any){ setErr(''); const f = e.target.files?.[0]; if (!f) return; const dlp = await runClientDlp(f); if (dlp.block) { setErr('Blocked: '+dlp.reason); return; } setFile(f); }
  async function upload(){ if(!file) return; const buf = await file.arrayBuffer(); enqueue({ id: crypto.randomUUID(), type:'attach.upload', payload:{ name:file.name, mime:file.type, bytes:Array.from(new Uint8Array(buf)) }, ts: Date.now(), deviceId }); setFile(null); }
  return (
    <div className="p-2">
      <input type="file" accept="image/*,application/pdf" onChange={onChange} />
      {err && <div className="text-red-600 text-sm mt-1">{err}</div>}
      <button className="rounded-2xl p-2 shadow mt-2" onClick={upload} disabled={!file}>Queue Upload</button>
    </div>
  );
}
```

### 6.2 Client DLP (web)
```ts
// apps/web/src/mobile/dlp.ts
export async function runClientDlp(file: File){
  if (file.size > 20*1024*1024) return { block:true, reason:'File too large' };
  if (/\.(exe|bat|sh)$/i.test(file.name)) return { block:true, reason:'Executable not allowed' };
  // TODO: OCR hook (WebAssembly) for basic text scan
  return { block:false };
}
```

### 6.3 Server DLP (OCR + rules)
```ts
// server/src/dlp/pipeline.ts
export type DlpResult = { action:'allow'|'warn'|'block'; reasons:string[] };
export async function runDlp(buf: Buffer, meta:{mime:string,name:string}) : Promise<DlpResult> {
  const reasons:string[] = [];
  if (buf.length > 20*1024*1024) reasons.push('size>20MB');
  if (!/^image\//.test(meta.mime) && meta.mime !== 'application/pdf') reasons.push('mime');
  // TODO: OCR then regex scan for emails/PII
  const action = reasons.length ? (reasons.includes('size>20MB') ? 'block' : 'warn') : 'allow';
  return { action, reasons };
}
```

### 6.4 MDM Attestation (server)
```ts
// server/src/security/mdm.ts
import * as jose from 'jose';
export async function verifyMdmToken(token:string, jwk: any){
  const { payload } = await jose.jwtVerify(token, await jose.importJWK(jwk));
  if (!payload || !payload['device_id'] || !payload['compliant']) throw new Error('MDM non-compliant');
  return payload; // { device_id, os, version, compliant }
}
```

### 6.5 OPA Device‑MDM Policy
```rego
# SECURITY/policy/opa/device_mdm.rego
package device_mdm

default allow = false

allow if {
  input.action in {"Upload","CaseWrite"}
  input.device.compliant == true
  startswith(input.device.os, "iOS") or startswith(input.device.os, "Android")
}
```

### 6.6 ER Rules (YAML) + Loader
```yaml
# server/src/er/rules/email_exact.yaml
id: email_exact
when:
  - field: email
    op: exact
    threshold: 1.0
explain: "Exact email match"
action: auto_candidate
```

```ts
// server/src/er/apply_rules.ts
import fs from 'fs'; import path from 'path'; import yaml from 'js-yaml';
export type Rule = { id:string; when:any[]; explain:string; action:'auto_candidate' };
export function loadRules(dir = 'server/src/er/rules'){ return fs.readdirSync(dir).filter(f=>f.endsWith('.yaml')).map(f=>yaml.load(fs.readFileSync(path.join(dir,f),'utf8')) as Rule); }
export function evaluate(record:any, existing:any, rules:Rule[]){
  const hits: any[] = [];
  for (const r of rules){
    const ok = r.when.every(w => w.op==='exact' ? (record[w.field] && record[w.field]===existing[w.field]) : false);
    if (ok) hits.push({ rule:r.id, explain:r.explain });
  }
  return hits;
}
```

### 6.7 Influence Diffusion (skeleton)
```ts
// server/src/analytics/motifs/influence_diffusion.ts
export type Influence = { node:string; score:number; reach:string[]; why:string };
export async function diffusion(adj: Map<string,string[]>, damping=0.85, iters=10): Promise<Influence[]>{
  const nodes = Array.from(adj.keys()); const n = nodes.length; const idx = new Map(nodes.map((k,i)=>[k,i]));
  const v = new Array(n).fill(1/n), next = new Array(n).fill(0);
  for(let t=0;t<iters;t++){
    next.fill((1-damping)/n);
    for(const [u, outs] of adj){ const ui = idx.get(u)!; const w = v[ui]/Math.max(1, outs.length); for(const vtx of outs){ next[idx.get(vtx)!] += damping*w; } }
    v.splice(0,v.length,...next);
  }
  return nodes.map((k,i)=>({ node:k, score:v[i], reach: adj.get(k)||[], why:`diffusion with damping=${damping}` }));
}
```

### 6.8 Influence Paths (skeleton)
```ts
// server/src/analytics/motifs/influence_paths.ts
export function kShortestPaths(graph:any, src:string, dst:string, k=3){
  // placeholder; replace with Yen's algorithm constrained by time/edge types
  return [[src,'…',dst]];
}
```

### 6.9 Edge mTLS Panels
```json
// helm/observability/dashboards/edge.json
{
  "title": "IntelGraph — Edge mTLS",
  "panels": [
    {"type":"stat","title":"Handshake Errors","targets":[{"expr":"sum(increase(ingress_mtls_handshake_errors_total[1h]))"}]},
    {"type":"graph","title":"Cert Age (days)","targets":[{"expr":"(time() - certificate_not_before_seconds)/86400"}]}
  ]
}
```

### 6.10 DLP Metrics (server)
```ts
// server/src/metrics/dlp.ts
import client from 'prom-client';
export const dlpBlocks = new client.Counter({ name:'dlp_blocks_total', help:'DLP blocks', labelNames:['reason'] });
export const dlpWarns  = new client.Counter({ name:'dlp_warns_total', help:'DLP warnings', labelNames:['reason'] });
export const dlpScanMs = new client.Histogram({ name:'dlp_scan_ms', help:'DLP scan times', buckets:[10,50,100,250,500,1000,2000] });
```

---

## 7) Observability (Grafana Panels)
```json
{
  "title": "IntelGraph — DLP & Influence",
  "panels": [
    {"type":"stat","title":"DLP Blocks","targets":[{"expr":"sum(increase(dlp_blocks_total[1h]))"}]},
    {"type":"graph","title":"DLP Scan p95 (ms)","targets":[{"expr":"histogram_quantile(0.95, sum(rate(dlp_scan_ms_bucket[10m])) by (le))"}]},
    {"type":"stat","title":"Top Influencer Score","targets":[{"expr":"max(influence_score)"}]}
  ]
}
```

---

## 8) CI/CD Deltas
```yaml
# .github/workflows/mobile-attachments-er-rules.yml
name: mobile-attachments-er-rules
on: [pull_request]
jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run -w apps/web build && npm test -w apps/web
  server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test -w server
  rego:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: opa test SECURITY/policy/opa -v
```

---

## 9) Helm Values (S26)
```yaml
# helm/server/values.sprint26.yaml
mobile:
  attachments: true
security:
  edgeMtls: enabled
  mdm: required
er:
  ruleAssist: true
motifs:
  influence: ["diffusion","paths"]
observability:
  dlpPanels: true
  edgePanels: true
```

---

## 10) Demo Script (2 min)
1) On mobile, capture photo → client DLP warns; choose “block” then “override with reason”; upload queues offline and syncs online; server DLP quarantines and explains; provenance shows hashes & reasons.  
2) Show edge mTLS dashboard; rotate certs with job; app continues; rollback plan noted.  
3) ER queue **Auto‑approve** lane shows exact‑email cohort; confirm one → merge recorded with rule id; precision counter stays ≥ 0.97.  
4) Influence overlay: toggle **Diffusion**; card shows top influencers and “why this matters”; click an entity → **Influence Paths** list; open explain card.  
5) Metrics panels: DLP blocks & scan p95; top influencer stat; all SLOs green.

---

## 11) Risks & Mitigations
- **DLP false positives / latency** → warn vs block tiers; cache OCR results; allow analyst override with reason + audit.  
- **MDM integration variance** → abstract providers; fallback posture checks; feature flags per tenant.  
- **Rule‑assist bias** → rules documented; conservative thresholds; human confirmation default; audit counters.  
- **Influence calc cost** → approximate methods + caching; limit to case subgraph; background refresh.

---

## 12) Seeds for Sprint 10
- Mobile: background uploads, capture presets, redaction on‑device.  
- DLP: ML classifier for sensitive media.  
- ER: probabilistic transitive clustering with active‑learned thresholds.  
- Influence: time‑aware diffusion and counterfactuals.  
- Security: attested WebPush for mobile, mTLS mutual auth at partner peering edge.

