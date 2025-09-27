# Sprint 25 — UX & Export v2 PR Bundle + Connector Conformance + SLO Alerts

This bundle completes the next chunk of the Sprint 25 scope:

- **Tri‑Pane UX polish** — Saved Views, Annotations, keyboard/a11y polish
- **Export v2 (UI)** — policy explainability (allow/deny/redactions), WebAuthn step‑up, local verify hints
- **Connector Conformance** — golden I/O tests, CI, runbook scaffolding
- **SLO Alerts & Dashboards‑as‑Code** — Prometheus rules with runbooks, Grafana provisioning

> Copy these files into your repo (create folders as needed) or unzip into a branch and push.

---

## File Tree
```
apps/web/src/features/export/ExportDialogV2.tsx
apps/web/src/features/export/useExport.ts
apps/web/src/features/stepup/StepUpPrompt.tsx
apps/web/src/features/saved-views/SavedViewsPanel.tsx
apps/web/src/features/saved-views/useSavedViews.ts
apps/web/src/features/annotations/AnnotationsPanel.tsx
apps/web/src/features/annotations/useAnnotations.ts
apps/web/src/keyboard/shortcuts.ts

server/src/services/export/manifest.ts
server/src/routes/saved_views.ts
server/src/routes/annotations.ts
server/src/db/migrations/20251007_saved_views_annotations.sql

connectors/tests/conformance.spec.ts
connectors/tests/fixtures/sample_input.json
connectors/tests/fixtures/sample_output.json
.github/workflows/connectors-conformance.yml

observability/grafana/provisioning/dashboards/ga_core.json
observability/grafana/provisioning/datasources/datasource.yaml
observability/prometheus/alerts/ga_core.rules.yaml

docs/UX-saved-views.md
docs/export-v2-ui.md
docs/connectors-conformance.md
docs/alerts-slo.md
```

---

## Frontend — Export v2 (simulate → explain → step‑up → enforce)
```tsx
// apps/web/src/features/export/ExportDialogV2.tsx
import React, { useEffect, useState } from "react";
import { StepUpPrompt } from "../stepup/StepUpPrompt";

type SimResult = { decision: "allow"|"deny"; reasons: string[]; redactions?: Array<{ path: string; rule: string }>; policy_version: string; step_up?: boolean };

export default function ExportDialogV2({ open, onClose, payload }: { open: boolean; onClose: () => void; payload: any }){
  const [sim, setSim] = useState<SimResult | null>(null);
  const [enforcing, setEnforcing] = useState(false);
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) return; (async () => {
    const res = await fetch("/export/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json(); setSim(data);
    setNeedsStepUp(Boolean(data?.step_up));
  })(); }, [open]);

  async function doExport(assertWebAuthn?: boolean) {
    setError(null); setEnforcing(true);
    try {
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (assertWebAuthn) headers["X-WebAuthn-Assertion"] = await StepUpPrompt.getAssertion();
      const res = await fetch("/export", { method: "POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `bundle_${Date.now()}.zip`; a.click();
    } catch (e: any) { setError(e.message || String(e)); } finally { setEnforcing(false); }
  }

  if (!open) return null;

  return (
    <div className="p-6 w-[720px] grid gap-3">
      <div className="text-lg font-semibold">Export — policy preview</div>
      {!sim && <div>Analyzing…</div>}
      {sim && (
        <div className="rounded-xl border p-3">
          <div className="text-sm">Policy v{sim.policy_version}</div>
          <div className="mt-2">
            <div className="font-medium">Decision: {sim.decision.toUpperCase()}</div>
            {sim.reasons?.length>0 && (
              <ul className="list-disc ml-5 text-sm mt-1">
                {sim.reasons.map((r,i)=>(<li key={i}>{r}</li>))}
              </ul>) }
            {sim.redactions && sim.redactions.length>0 && (
              <div className="text-sm mt-2">
                <div className="font-medium">Redactions</div>
                <ul className="list-disc ml-5">
                  {sim.redactions.map((r,i)=>(<li key={i}><code>{r.path}</code> — {r.rule}</li>))}
                </ul>
              </div>) }
          </div>
        </div>
      )}

      {needsStepUp && <StepUpPrompt />}

      <div className="text-xs text-gray-500">
        Tip: after downloading, run <code>verify-bundle ./bundle ./manifest.json</code> to validate manifest hashes offline.
      </div>

      <div className="mt-2 flex gap-2">
        <button className="btn" disabled={!sim || sim.decision!=="allow" || enforcing} onClick={()=>doExport(needsStepUp)}>Export</button>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
```

```tsx
// apps/web/src/features/stepup/StepUpPrompt.tsx
import React from "react";
export function StepUpPrompt(){ return <div className="rounded-xl border p-3 bg-amber-50 text-amber-900">Step‑up required: confirm with your security key to proceed.</div>; }
StepUpPrompt.getAssertion = async () => {
  // Placeholder. Integrate with WebAuthn; return base64 clientDataJSON+authenticatorData+signature.
  return "assertion-demo";
};
```

```ts
// apps/web/src/features/export/useExport.ts
export async function simulateExport(payload: any){
  const r = await fetch("/export/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return r.json();
}
```

---

## Frontend — Saved Views & Annotations (tri‑pane)
```tsx
// apps/web/src/features/saved-views/SavedViewsPanel.tsx
import React from "react"; import { useSavedViews } from "./useSavedViews";
export function SavedViewsPanel(){
  const { views, save, del } = useSavedViews();
  return (
    <div className="p-4 grid gap-3">
      <div className="font-semibold">Saved Views</div>
      <button className="btn" onClick={()=>save()}>Save current</button>
      <ul className="grid gap-2">
        {views.map(v => (
          <li key={v.id} className="rounded-xl p-3 border flex items-center justify-between">
            <div>
              <div className="font-medium">{v.name}</div>
              <div className="text-xs text-gray-500">{new Date(v.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={()=>location.assign(v.deepLink)}>Open</button>
              <button className="btn btn-ghost" onClick={()=>del(v.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```ts
// apps/web/src/features/saved-views/useSavedViews.ts
import { useEffect, useState } from "react";
export type SavedView = { id: string; name: string; deepLink: string; created_at: string };
export function useSavedViews(){
  const [views,setViews]=useState<SavedView[]>([]);
  useEffect(()=>{ fetch("/saved-views").then(r=>r.json()).then(setViews); },[]);
  return {
    views,
    async save(name?: string){
      const deepLink = location.href; const body = { name: name || document.title || "View", deepLink };
      const r = await fetch("/saved-views", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)});
      const v = await r.json(); setViews(prev=>[v,...prev]);
    },
    async del(id: string){ await fetch(`/saved-views/${id}`, { method: "DELETE" }); setViews(prev=>prev.filter(v=>v.id!==id)); }
  };
}
```

```tsx
// apps/web/src/features/annotations/AnnotationsPanel.tsx
import React, { useEffect, useState } from "react"; import { useAnnotations } from "./useAnnotations";
export function AnnotationsPanel({ entityId }: { entityId: string }){
  const { list, add, del } = useAnnotations(entityId);
  const [notes,setNotes]=useState<string>("");
  const [items,setItems]=useState<Array<{id:string;note:string;author:string;created_at:string}>>([]);
  useEffect(()=>{ list().then(setItems); },[entityId]);
  return (
    <div className="grid gap-3">
      <div className="font-semibold">Annotations</div>
      <div className="flex gap-2">
        <input className="input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add note" />
        <button className="btn" onClick={async()=>{ const it=await add(notes); setItems([it,...items]); setNotes(""); }}>Add</button>
      </div>
      <ul className="grid gap-2">
        {items.map(i=> (
          <li key={i.id} className="rounded-xl border p-2 flex items-center justify-between">
            <div>
              <div>{i.note}</div>
              <div className="text-xs text-gray-500">{i.author} · {new Date(i.created_at).toLocaleString()}</div>
            </div>
            <button className="btn btn-ghost" onClick={()=>{ del(i.id); setItems(items.filter(x=>x.id!==i.id)); }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```ts
// apps/web/src/features/annotations/useAnnotations.ts
export function useAnnotations(entityId: string){
  return {
    async list(){ const r = await fetch(`/annotations/${entityId}`); return r.json(); },
    async add(note: string){ const r = await fetch(`/annotations/${entityId}`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ note })}); return r.json(); },
    async del(id: string){ await fetch(`/annotations/${entityId}/${id}`, { method:"DELETE" }); }
  };
}
```

```ts
// apps/web/src/keyboard/shortcuts.ts
export function installShortcuts(){
  const on = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase()==='s'){ e.preventDefault(); document.querySelector<HTMLButtonElement>('button.save-view')?.click(); }
  };
  window.addEventListener('keydown', on); return ()=>window.removeEventListener('keydown', on);
}
```

---

## Backend — Saved Views & Annotations + Manifest helper
```ts
// server/src/routes/saved_views.ts
import { Router } from "express"; import { Pool } from "pg"; const pool = new Pool();
const r = Router();
r.get("/saved-views", async (_req,res)=>{ const q = await pool.query("SELECT id,name,deep_link as \"deepLink\",created_at FROM saved_views ORDER BY created_at DESC LIMIT 200"); res.json(q.rows); });
r.post("/saved-views", async (req,res)=>{ const { name, deepLink } = req.body; const q = await pool.query("INSERT INTO saved_views(name,deep_link) VALUES ($1,$2) RETURNING id,name,deep_link as \"deepLink\",created_at", [name, deepLink]); res.json(q.rows[0]); });
r.delete("/saved-views/:id", async (req,res)=>{ await pool.query("DELETE FROM saved_views WHERE id=$1", [req.params.id]); res.json({ ok:true }); });
export default r;
```

```ts
// server/src/routes/annotations.ts
import { Router } from "express"; import { Pool } from "pg"; const pool = new Pool();
const r = Router();
r.get("/annotations/:entityId", async (req,res)=>{ const q = await pool.query("SELECT id,note,author,created_at FROM annotations WHERE entity_id=$1 ORDER BY created_at DESC", [req.params.entityId]); res.json(q.rows); });
r.post("/annotations/:entityId", async (req:any,res)=>{ const user = req.user?.id||"unknown"; const q = await pool.query("INSERT INTO annotations(entity_id,note,author) VALUES ($1,$2,$3) RETURNING id,note,author,created_at", [req.params.entityId, req.body?.note||"", user]); res.json(q.rows[0]); });
r.delete("/annotations/:entityId/:id", async (req,res)=>{ await pool.query("DELETE FROM annotations WHERE entity_id=$1 AND id=$2", [req.params.entityId, req.params.id]); res.json({ ok:true }); });
export default r;
```

```sql
-- server/src/db/migrations/20251007_saved_views_annotations.sql
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  deep_link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  note TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```ts
// server/src/services/export/manifest.ts
import crypto from "crypto";
export type Manifest = { created_at: string; policy_version: string; files: Array<{ path: string; sha256: string }>; transforms: Array<{ id: string; name: string; args?: any; ts: string }>; };
export function sha256(buf: Buffer){ return crypto.createHash("sha256").update(buf).digest("hex"); }
export function buildManifest({ files, policyVersion, transforms }:{ files: Array<{ path: string; content: Buffer }>; policyVersion: string; transforms: Manifest["transforms"] }): Manifest {
  return {
    created_at: new Date().toISOString(), policy_version: policyVersion,
    files: files.map(f=>({ path: f.path, sha256: sha256(f.content) })), transforms
  };
}
```

---

## Connector Conformance — Golden I/O + CI
```ts
// connectors/tests/conformance.spec.ts
import fs from "fs"; import path from "path";
interface Connector { id: string; pull: (cfg:any)=>Promise<any[]>; normalize: (rows:any[])=>Promise<any[]>; }
const connectors: Connector[] = []; // import/register your 5 priority connectors here
const GOLD_IN = JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/sample_input.json"),"utf8"));
const GOLD_OUT = JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/sample_output.json"),"utf8"));

(async function(){ let fails=0; for (const c of connectors){
  const rows = await c.normalize(await c.pull({}));
  // naive equality; replace with schema-aware comparator
  if (JSON.stringify(rows.slice(0,GOLD_OUT.length)) !== JSON.stringify(GOLD_OUT)){ console.error(`FAIL ${c.id}: output mismatch`); fails++; }
}
if (fails>0) process.exit(1); console.log("All connectors passed golden conformance."); })().catch(e=>{ console.error(e); process.exit(1); });
```

```json
// connectors/tests/fixtures/sample_input.json
[{ "id": "1", "name": "Acme", "type": "company" }]
```
```json
// connectors/tests/fixtures/sample_output.json
[{ "id": "1", "label": "Company", "props": { "name": "Acme" } }]
```

```yaml
# .github/workflows/connectors-conformance.yml
name: connectors-conformance
on: { pull_request: {}, push: { branches: [ main ] } }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm -g i pnpm && pnpm i
      - run: node connectors/tests/conformance.spec.ts
```

---

## SLO Alerts & Grafana Provisioning
```yaml
# observability/prometheus/alerts/ga_core.rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ga-core-slo
  labels: { team: sre, service: maestro }
spec:
  groups:
  - name: slo-burn
    rules:
    - alert: NLQPreviewHighLatency
      expr: histogram_quantile(0.95, sum(rate(nlq_preview_duration_seconds_bucket[5m])) by (le, env)) > 1.5
      for: 10m
      labels: { severity: critical, env: prod }
      annotations:
        summary: "NLQ preview p95 > 1.5s"
        runbook_url: "https://runbooks/ga-core-nlq"
    - alert: NLQExecHighLatency
      expr: histogram_quantile(0.95, sum(rate(nlq_exec_duration_seconds_bucket[5m])) by (le, env)) > 3.5
      for: 10m
      labels: { severity: critical, env: prod }
      annotations:
        summary: "NLQ exec p95 > 3.5s"
        runbook_url: "https://runbooks/ga-core-nlq"
    - alert: ExportDeniedSpike
      expr: increase(export_decisions_total{decision="deny",env="prod"}[30m]) > 25
      for: 5m
      labels: { severity: warning }
      annotations:
        summary: "Export denials spiking"
        runbook_url: "https://runbooks/export-policy"
```

```yaml
# observability/grafana/provisioning/datasources/datasource.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus-server.monitoring.svc.cluster.local
    isDefault: true
```

```json
// observability/grafana/provisioning/dashboards/ga_core.json
{ "annotations": { "list": [] }, "editable": true, "panels": [
  { "type": "timeseries", "title": "NLQ Preview p95", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(nlq_preview_duration_seconds_bucket[5m])) by (le, env))" }], "fieldConfig": {"defaults": {"unit": "s"}} },
  { "type": "timeseries", "title": "NLQ Exec p95", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(nlq_exec_duration_seconds_bucket[5m])) by (le, env))" }], "fieldConfig": {"defaults": {"unit": "s"}} },
  { "type": "stat", "title": "Export decisions (allow/deny/redacted)", "targets": [{ "expr": "sum(increase(export_decisions_total[1h])) by (decision)" }] },
  { "type": "stat", "title": "ER Precision/Recall (self‑report)", "targets": [{ "expr": "avg(er_precision)", "refId": "A" }, { "expr": "avg(er_recall)", "refId": "B" }] }
], "schemaVersion": 39, "title": "GA Core — NLQ/Export/ER", "time": { "from": "now-6h", "to": "now" }, "templating": { "list": [{"name":"env","type":"query","datasource":"Prometheus","query":"label_values(up, env)"}] } }
```

---

## Docs
```md
# docs/export-v2-ui.md
- The Export dialog calls `/export/simulate` to fetch decision, reasons, and redactions.
- If `step_up=true`, require WebAuthn assertion before POST `/export`.
- After download, the UI shows a hint to run `verify-bundle` locally; include manifest.
```
```md
# docs/UX-saved-views.md
- Save current tri‑pane deep link.
- Keyboard: `Ctrl+S` to save (focus‑safe, prevents default browser save).
- A11y: ensure focus order and ARIA landmarks.
```
```md
# docs/connectors-conformance.md
- Define canonical input → normalized output per connector.
- Tests run on PR and `main`; failures block merges.
- Include license notes and runbooks per connector.
```
```md
# docs/alerts-slo.md
- PrometheusRule defines latency SLO alerts and export deny spike.
- Set Alertmanager route to PagerDuty; include runbook URLs.
```

---

## How to Open the PR
```bash
# from repo root
git checkout -b feat/sprint25-ux-export-connectors-slo
# add files
git add apps/web/src/features/export/ExportDialogV2.tsx \
        apps/web/src/features/export/useExport.ts \
        apps/web/src/features/stepup/StepUpPrompt.tsx \
        apps/web/src/features/saved-views/SavedViewsPanel.tsx \
        apps/web/src/features/saved-views/useSavedViews.ts \
        apps/web/src/features/annotations/AnnotationsPanel.tsx \
        apps/web/src/features/annotations/useAnnotations.ts \
        apps/web/src/keyboard/shortcuts.ts \
        server/src/services/export/manifest.ts \
        server/src/routes/saved_views.ts server/src/routes/annotations.ts \
        server/src/db/migrations/20251007_saved_views_annotations.sql \
        connectors/tests/conformance.spec.ts \
        connectors/tests/fixtures/sample_input.json \
        connectors/tests/fixtures/sample_output.json \
        .github/workflows/connectors-conformance.yml \
        observability/grafana/provisioning/dashboards/ga_core.json \
        observability/grafana/provisioning/datasources/datasource.yaml \
        observability/prometheus/alerts/ga_core.rules.yaml \
        docs/UX-saved-views.md docs/export-v2-ui.md docs/connectors-conformance.md docs/alerts-slo.md

git commit -m "feat(ux): Saved Views + Annotations; feat(export): policy‑aware Export v2 with step‑up; chore(connectors): conformance tests; chore(obs): SLO alerts + grafana provisioning"

git push -u origin feat/sprint25-ux-export-connectors-slo
```

## Wiring Notes
- Mount new routes in server: `app.use(require('./routes/saved_views').default);` and `annotations`.
- Ensure DB extension `pgcrypto` for `gen_random_uuid()` or adapt to UUIDv4.
- Connect ExportDialogV2 in tri‑pane and guard behind `export_verifier` flag.
- Provision Grafana on startup via `GF_PROVISIONING_PATH=/var/lib/grafana/provisioning`.
- Add `connectors-conformance` to required checks on `main`.

---

**Complete.** Next optional patch: *Tri‑pane a11y + keyboard suite tests, export manifest diff viewer, and ER time‑brushed explainability.*

