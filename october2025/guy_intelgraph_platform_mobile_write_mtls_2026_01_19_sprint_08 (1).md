# Guy • IntelGraph Platform Workstream — **Mobile Write Ops, Geo‑Temporal Motifs & mTLS** (Sprint 08)

**Slug:** `guy-intelgraph-platform-mobile-write-mtls-2026-01-19-sprint-08`  
**Window:** Jan 19–Jan 30, 2026 (10 biz days)  
**Cadence alignment:** Company Sprint 25 (Q1’26). Builds on S07 “Collab GA, Motifs v1.1 & Mobile Pilot”.

**Repo base:** `summit-main/` (apps/web, server, er-service, prov-ledger, graph-xai, helm, terraform).

---

## 0) Continuity & Strategic Delta

**Shipped up to S07:** Collab 1.0 GA (presence/threads/mentions), Motifs v1.1 (cascades/bridges), digest notifications, PWA mobile pilot, CSRF/CSP + SBOM/SLSA.  
**New focus:** make **mobile** useful beyond read‑only; add **geo‑temporal motif pack**; round out **security** with **mTLS** and **device posture**; improve **ER review UX**; and push **performance** (latency budgets, cache tiers) while keeping provenance/policy intact.

---

## 1) Sprint Goal

Deliver **Mobile Write Ops v0.9**, **Geo‑Temporal Motifs v1**, and **Zero‑Trust Core (mTLS + Device Posture)**. Harden ER review flows and hold p95 query <1.2s on demo while digesting mobile traffic.

**Victory Conditions**

- Mobile can **create notes & pins** with conflict‑free merges; offline → queue; online → sync in ≤ 3s; provenance includes device+user.
- **Geo‑Temporal motifs** (geo‑clusters, route overlap, hotspot churn) render overlays in < 350ms; alerts explain risk.
- **mTLS** between services with automated cert rotation; **device posture** (OS, integrity, app version) gates mobile writes via OPA.
- ER review queue supports **batch decisions** and **cluster preview**; median decision time ↓ 25%.
- SLOs remain green: graph p95 < 1.2s; WS p95 < 150ms; mobile sync success ≥ 99%.

---

## 2) Backlog (Stories → Acceptance)

### A. Mobile Write Ops

1. **Offline Queue & Sync** (`apps/web/src/mobile/offline-queue.ts`, `server/src/mobile/sync.ts`)  
   _AC:_ queue CRUD for notes/pins; retry/backoff; idempotent server apply; provenance logs device+ts.
2. **Conflict‑Free Merge (CRDT-lite)** (`apps/web/src/mobile/crdt.ts`)  
   _AC:_ Last‑writer‑wins per field + op timestamps; tie‑break by device id; tests for conflicts.
3. **Mobile Notes & Pins UI** (`apps/web/src/mobile/WriteOps.tsx`)  
   _AC:_ Create/edit/delete; show sync state; failure banner with retry.

### B. Geo‑Temporal Motifs v1

4. **Geo Clusters (DBSCAN)** (`server/src/analytics/motifs/geo_clusters.ts`)  
   _AC:_ Clusters on (lat,lon,t) with eps/minPts; explain counts/venues; privacy fuzzing if needed.
5. **Route Overlap** (`server/src/analytics/motifs/route_overlap.ts`)  
   _AC:_ Detect entities with ≥X% path overlap in Δt; return score + why; cache results.
6. **Hotspot Churn** (`server/src/analytics/motifs/hotspot_churn.ts`)  
   _AC:_ Identify locations switching from low→high activity; alert thresholds; suppress noisy cells.

### C. Security — Zero‑Trust Core

7. **mTLS Everywhere** (`helm/base/certs`, `server/src/security/mtls.ts`)  
   _AC:_ Mutual TLS intra‑cluster; automated rotation; health checks; break‑glass path.
8. **Device Posture Signals** (`server/src/security/posture.ts`, OPA `device.rego`)  
   _AC:_ Validate claims (OS, version, attestation); OPA allows/denies writes; audit rationale.

### D. ER Review UX & Perf

9. **Batch Decisions** (`apps/web/src/features/er-queue/batch.tsx`)  
   _AC:_ Multi‑select; accept/decline in bulk; keyboard shortcuts; provenance per decision.
10. **Cluster Preview** (`apps/web/src/features/er-queue/cluster-preview.tsx`)  
    _AC:_ Hover → mini‑graph + top features; reduces decision time.
11. **Cache Tiering + Cold Path** (`server/src/graph/cache_tiers.ts`)  
    _AC:_ L1 in‑proc, L2 Redis; cacheable resolvers annotated; cold‑path metrics.

### E. Observability

12. **Mobile Sync Metrics** (`server/src/metrics/mobile_sync.ts`)  
    _AC:_ Queue depth, success/failure, latency histograms; Grafana panels + alerts.
13. **Motif Geo Panels** (`helm/observability/dashboards/geo.json`)  
    _AC:_ Cluster counts, churn rate, route overlap distributions; budgets.

---

## 3) Jira Subtasks CSV (import‑ready)

```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Offline Queue,"Mobile queue + idempotent sync + provenance.",High,mobile,web;server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-20,IG-<parent>
Sub-task,IG,CRDT-lite,"Field LWW + device tie-break + tests.",High,mobile,web,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-21,IG-<parent>
Sub-task,IG,Mobile Write UI,"Notes/pins create/edit/delete with sync state.",High,mobile,web,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-21,IG-<parent>
Sub-task,IG,Geo Clusters,"DBSCAN on (lat,lon,t) with explain + fuzzing.",High,analytics,server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-25,IG-<parent>
Sub-task,IG,Route Overlap,"Percent overlap, scoring, cache.",High,analytics,server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-26,IG-<parent>
Sub-task,IG,Hotspot Churn,"Low→high activity detection + alerts.",Medium,analytics,server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-26,IG-<parent>
Sub-task,IG,mTLS Everywhere,"Mutual TLS intra-cluster + rotation.",High,security,ops;server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-22,IG-<parent>
Sub-task,IG,Device Posture,"Attestation claims + OPA gate + audit.",High,security,server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-23,IG-<parent>
Sub-task,IG,ER Batch Decisions,"Multi-select + bulk accept/decline.",High,er,web,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-24,IG-<parent>
Sub-task,IG,ER Cluster Preview,"Mini-graph + top features hover.",Medium,er,web,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-24,IG-<parent>
Sub-task,IG,Cache Tiering,"L1/L2 caches + annotations + metrics.",Medium,perf,server,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-23,IG-<parent>
Sub-task,IG,Mobile Sync Metrics,"Queue depth, success, latency, alerts.",Medium,telemetry,ops,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-22,IG-<parent>
Sub-task,IG,Geo Panels,"Cluster counts, churn, route overlap.",Medium,telemetry,ops,,guy@intelgraph.dev,2026.01.r2,"Sprint 25 (Jan 19–30, 2026)",2026-01-27,IG-<parent>
```

---

## 4) Branching Plan

- Branch: `feature/mobile-write-geo-mtls`
- Integration branches: `feat/mobile-queue`, `feat/mobile-crdt`, `feat/mobile-write-ui`, `feat/motif-geo-clusters`, `feat/motif-route-overlap`, `feat/motif-hotspot-churn`, `feat/mtls`, `feat/device-posture`, `feat/er-batch`, `feat/er-cluster-preview`, `feat/cache-tiering`, `feat/mobile-sync-metrics`, `feat/geo-panels`.

---

## 5) Architecture Delta (ASCII)

```text
Mobile PWA
  ├─ Offline Queue → Sync API
  └─ CRDT-lite merge
      │
      ▼
Server
  ├─ security/mtls (mutual TLS) + security/posture (OPA gate)
  ├─ analytics/motifs (geo_clusters, route_overlap, hotspot_churn)
  ├─ er-queue (batch decisions, cluster preview)
  └─ graph/cache_tiers (L1/L2 + metrics)

Observability: mobile sync panels; geo motif dashboards.
```

---

## 6) Code Scaffolding (drop‑in files)

### 6.1 Mobile Offline Queue

```ts
// apps/web/src/mobile/offline-queue.ts
export type Op = {
  id: string;
  type: 'note.create' | 'note.update' | 'note.delete' | 'pin.set' | 'pin.unset';
  payload: any;
  ts: number;
  deviceId: string;
};
const KEY = 'ig-mobile-ops-v1';
export function enqueue(op: Op) {
  const q = JSON.parse(localStorage.getItem(KEY) || '[]');
  q.push(op);
  localStorage.setItem(KEY, JSON.stringify(q));
}
export function drain() {
  const q = JSON.parse(localStorage.getItem(KEY) || '[]');
  localStorage.setItem(KEY, '[]');
  return q as Op[];
}
export function peek() {
  return JSON.parse(localStorage.getItem(KEY) || '[]') as Op[];
}
```

### 6.2 CRDT‑lite Merge

```ts
// apps/web/src/mobile/crdt.ts
export function lwwMerge(
  a: any,
  b: any,
  aTs: number,
  bTs: number,
  aDev: string,
  bDev: string,
) {
  if (aTs === bTs) return aDev < bDev ? a : b; // deterministic tie‑break
  return aTs > bTs ? a : b;
}
```

### 6.3 Mobile Write UI

```tsx
// apps/web/src/mobile/WriteOps.tsx
import React, { useState } from 'react';
import { enqueue } from './offline-queue';
export default function WriteOps({ deviceId }: { deviceId: string }) {
  const [note, setNote] = useState('');
  function create() {
    enqueue({
      id: crypto.randomUUID(),
      type: 'note.create',
      payload: { text: note },
      ts: Date.now(),
      deviceId,
    });
    setNote('');
  }
  return (
    <div className="p-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-2xl p-2 shadow"
        placeholder="New note…"
      />
      <button className="mt-2 rounded-2xl p-2 shadow" onClick={create}>
        Save
      </button>
    </div>
  );
}
```

### 6.4 Sync API (server)

```ts
// server/src/mobile/sync.ts
import type { Request, Response } from 'express';
export async function syncOps(req: Request, res: Response) {
  const { ops, deviceId } = req.body || {};
  if (!Array.isArray(ops))
    return res.status(400).json({ error: 'ops required' });
  // TODO: OPA posture gate checked earlier in middleware
  const results = [] as any[];
  for (const op of ops) {
    // idempotency via op.id ledger
    results.push({ id: op.id, status: 'applied' });
  }
  res.json({ results });
}
```

### 6.5 Geo Clusters (DBSCAN skeleton)

```ts
// server/src/analytics/motifs/geo_clusters.ts
export type Point = { lat: number; lon: number; t: number };
export function haversine(a: Point, b: Point) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLon = toRad(b.lon - a.lon);
  const s1 = Math.sin(dLat / 2),
    s2 = Math.sin(dLon / 2);
  const A = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(A));
}
export function dbscan(points: Point[], epsMeters: number, minPts: number) {
  /* placeholder: return [] */ return [];
}
```

### 6.6 Route Overlap (skeleton)

```ts
// server/src/analytics/motifs/route_overlap.ts
export type Track = {
  id: string;
  points: { lat: number; lon: number; t: number }[];
};
export function overlap(a: Track, b: Track) {
  /* compute DTW or windowed Hausdorff on time‑aligned segments; return percent */ return 0.0;
}
```

### 6.7 Hotspot Churn (skeleton)

```ts
// server/src/analytics/motifs/hotspot_churn.ts
export type Cell = { id: string; count: number; prev: number };
export function churn(cells: Cell[], threshold = 2.0) {
  return cells
    .filter((c) => c.prev > 0 && c.count / c.prev >= threshold)
    .map((c) => ({ id: c.id, ratio: c.count / c.prev }));
}
```

### 6.8 mTLS Helpers

```ts
// server/src/security/mtls.ts
import fs from 'fs';
import https from 'https';
export function httpsServer(app: any) {
  const key = fs.readFileSync(process.env.TLS_KEY as string);
  const cert = fs.readFileSync(process.env.TLS_CERT as string);
  const ca = fs.readFileSync(process.env.TLS_CA as string);
  return https.createServer(
    { key, cert, ca, requestCert: true, rejectUnauthorized: true },
    app,
  );
}
```

### 6.9 Device Posture Policy (rego skeleton)

```rego
# SECURITY/policy/opa/device.rego
package device

default allow = false

allow if {
  input.user.role in {"Analyst","Admin"}
  input.action == "MobileWrite"
  input.device.os in {"iOS","Android"}
  input.device.appVersion >= "1.0.0"
  input.device.attested == true
}
```

### 6.10 Cache Tiering (server)

```ts
// server/src/graph/cache_tiers.ts
import LRU from 'lru-cache';
import { createClient } from 'redis';
const l1 = new LRU<string, any>({ max: 2000, ttl: 10000 });
const r = createClient({ url: process.env.REDIS_URL });
export async function init() {
  await r.connect();
}
export async function get(key: string) {
  const v = l1.get(key);
  if (v) return v;
  const s = await r.get(key);
  if (s) {
    const o = JSON.parse(s);
    l1.set(key, o);
    return o;
  }
  return null;
}
export async function set(key: string, val: any, ttl = 60) {
  l1.set(key, val, { ttl: ttl * 1000 });
  await r.setEx(key, ttl, JSON.stringify(val));
}
```

### 6.11 ER Batch Decisions (web)

```tsx
// apps/web/src/features/er-queue/batch.tsx
import React, { useState } from 'react';
import $ from 'jquery';
export default function Batch() {
  const [sel, setSel] = useState<string[]>([]);
  function act(decision: 'accept' | 'decline') {
    $.ajax({
      url: '/api/er/decision/batch',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ ids: sel, decision }),
    });
  }
  return (
    <div className="p-2">
      <button
        className="rounded-2xl p-2 shadow mr-2"
        onClick={() => act('accept')}
      >
        Accept Selected
      </button>
      <button className="rounded-2xl p-2 shadow" onClick={() => act('decline')}>
        Decline Selected
      </button>
    </div>
  );
}
```

---

## 7) Observability (Grafana Panels)

```json
{
  "title": "IntelGraph — Mobile & Geo",
  "panels": [
    {
      "type": "graph",
      "title": "Mobile Sync p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(mobile_sync_latency_ms_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "Mobile Sync Success %",
      "targets": [
        {
          "expr": "sum(increase(mobile_sync_success_total[1h])) / sum(increase(mobile_sync_attempt_total[1h]))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "Geo Hotspot Churn",
      "targets": [{ "expr": "sum(increase(geo_hotspot_churn_total[1h]))" }]
    }
  ]
}
```

---

## 8) CI/CD Deltas

```yaml
# .github/workflows/mobile-geo-mtls.yml
name: mobile-geo-mtls
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

## 9) Helm Values (S25)

```yaml
# helm/server/values.sprint25.yaml
mobile:
  writeOps: true
security:
  mtls: enabled
  devicePosture: required
cache:
  l1: enabled
  l2: redis
motifs:
  geo: ['clusters', 'route_overlap', 'hotspot_churn']
observability:
  mobileSyncPanels: true
```

---

## 10) Demo Script (2 min)

1. On mobile, create a note/pin offline → reconnect → sync completes; Case Space shows new items; provenance lists device+user+ts.
2. Enable **Geo Clusters** overlay → chips show counts; click **Route Overlap** between two entities; open alert card with explanation.
3. Trigger **Hotspot Churn** alert; snooze; show geo dashboard panels.
4. Show mTLS cert rotation logs; attempt mobile write with untrusted posture → OPA denial with rationale.
5. In ER queue, multi‑select five items → bulk accept; hover cluster preview; p95 query still <1.2s.

---

## 11) Risks & Mitigations

- **Offline sync conflicts** → deterministic CRDT rules + server sanity checks; user‑visible conflict banner.
- **Geo privacy** → fuzz sensitive geos; redact at export; DPIA notes per connector.
- **mTLS rollout** → staged canary, dual‑stack (plaintext+mtls) behind feature flag; automated rotation rehearsals.
- **Cache inconsistency** → short TTLs, write‑through on merges; cache‑bust on policy changes.

---

## 12) Seeds for Sprint 09

- Mobile: attachments (camera uploads) with DLP checks.
- Motifs: influence diffusion (KEMENY), venue anomaly baselines.
- Security: mTLS external edge, device posture attestation via MDM integration.
- ER: rule‑assisted merging for high‑confidence cohorts.
