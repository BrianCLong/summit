# Guy • IntelGraph Platform Workstream — **Collaborative Intelligence & Motif Library v1** (Sprint 06)
**Slug:** `guy-intelgraph-platform-collab-motifs-2025-12-15-sprint-06`  
**Window:** Dec 15–Dec 26, 2025 (10 biz days)  
**Cadence alignment:** Company Sprint 23 (Q4’25). Builds on S05 Recoverability & Active ER v1.1.

**Repo base:** `summit-main/` (apps/web, server, er-service, prov-ledger, graph-xai, helm, terraform).  

---

## 0) Continuity & Strategic Delta
**Shipped up to S05:** Unmerge + lineage rewind, active-learning ER, Marketplace v0.1 (S3/JSONL), multi‑graph read‑through.  
**New focus:** deepen **collaboration** (presence, comments, @mentions) and ship **Motif Library v1** (temporal triangles, venue co‑occurrence, cross‑channel bursts) with explainable overlays and alerting. Harden ER with **hierarchical clustering** & **transitive closure** tools and polish recoverability at scale.

---

## 1) Sprint Goal
Deliver **Collaborative Intelligence & Motif Library v1**: real‑time presence & comments in Case Spaces, @mentions with policy‑aware notifications, a curated motif library with explainable chips & alerts, and ER cluster builder with transitive closure and safe unmerge boundaries — all observable and policy‑enforced.

**Victory Conditions**
- Case Spaces show live presence, typing indicators, and threaded comments; @mentions notify within 2s and respect OPA visibility.
- Motif Library v1 computes **temporal triangles, venue co‑occurrence, cross‑channel bursts**; overlays render in <350ms on demo; each motif has a “why” explanation.
- ER clustering forms stable clusters with adjustable thresholds; **unmerge boundaries** prevent cross‑cluster collapse; UI shows cluster lineage.
- SLOs remain green: p95 graph query < 1.3s; motif job p95 < 2.0s on demo; notification deliver < 2s.

---

## 2) Backlog (Stories → Acceptance)
### A. Collaboration
1. **Presence & Typing** (`apps/web/src/features/case-space/presence.tsx`)  
   *AC:* Presence avatars, idle/active states, typing indicators via Socket.IO rooms; OPA filters room membership.
2. **Comments & Threads** (`apps/web/src/features/case-space/comments.tsx`)  
   *AC:* Threaded comments on nodes/edges/clusters; edit/delete with audit; export to provenance.
3. **@Mentions & Notifications** (`server/src/notify/` + `apps/web/src/features/case-space/mentions.tsx`)  
   *AC:* @user autocomplete (policy-scoped); notifications delivered via WebSocket & email webhook; opt‑out respected.

### B. Motif Library v1
4. **Temporal Triangles** (`server/src/analytics/motifs/temporal_triangles.ts`)  
   *AC:* Detect A↔B↔C cycles within Δt window; return scores & explanations; cached.
5. **Venue Co‑occurrence** (`server/src/analytics/motifs/venue_cooccur.ts`)  
   *AC:* Detect entities co‑present at locations/time buckets; handle geo fuzzing/redaction.
6. **Cross‑Channel Bursts** (`server/src/analytics/motifs/cross_channel_bursts.ts`)  
   *AC:* Burst detection across comms types; returns burst windows, intensity, sources.
7. **Motif Chips & Alerts** (`apps/web/src/features/tri-pane/motif-chips.tsx`, `server/src/alerts/motifs.ts`)  
   *AC:* UI chips; click → explain card; alert rules (per case) with rate limit and policy checks.

### C. ER Hardening
8. **Hierarchical Clustering & Transitive Closure** (`er-service/cluster/`)  
   *AC:* Build clusters from pairwise scores; explain cluster membership; guard against chain merges.
9. **Unmerge Boundaries** (`server/src/graph/unmerge_boundary.ts`)  
   *AC:* Track cluster borders; prevent unmerge crossing; OPA policy + denial rationale.

### D. Ops & Observability
10. **Notification QoS** (`helm/observability/dashboards/notify.json`)  
    *AC:* Delivery latency p95, queue depth, failure rate, user opt‑out counts.
11. **Motif Job Panels** (`helm/observability/dashboards/motifs.json`)  
    *AC:* Job durations, cache hit ratio, result sizes; alerts on overrun.

---

## 3) Jira Subtasks CSV (import‑ready)
```csv
Issue Type,Project Key,Summary,Description,Priority,Labels,Components,Assignee,Reporter,Fix Version/s,Sprint,Due Date,Parent Key
Sub-task,IG,Presence & Typing,"Socket.IO presence/typing with OPA-scoped rooms.",High,collab,web;server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-16,IG-<parent>
Sub-task,IG,Comments & Threads,"Threaded comments on graph items with audit.",High,collab,web;server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-18,IG-<parent>
Sub-task,IG,@Mentions & Notify,"Mentions, autocomplete, WS + email webhook.",High,collab,web;server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-18,IG-<parent>
Sub-task,IG,Temporal Triangles,"Δt cycles with explanations + cache.",High,analytics,server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-20,IG-<parent>
Sub-task,IG,Venue Co‑occurrence,"Co‑presence by location/time with geo fuzz.",High,analytics,server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-20,IG-<parent>
Sub-task,IG,Cross‑Channel Bursts,"Multi‑channel burst detection + intensity.",High,analytics,server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-21,IG-<parent>
Sub-task,IG,Motif Chips & Alerts,"UI chips + alert rules with OPA checks.",High,analytics,web;server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-22,IG-<parent>
Sub-task,IG,ER Clustering,"Hierarchical clusters + transitive closure.",High,er,er-service,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-21,IG-<parent>
Sub-task,IG,Unmerge Boundaries,"Cluster borders + policy guard.",High,er,server,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-22,IG-<parent>
Sub-task,IG,Notify QoS Panels,"Latency, queue depth, failures, opt-out.",Medium,telemetry,ops,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-17,IG-<parent>
Sub-task,IG,Motif Job Panels,"Durations, cache hits, sizes, alerts.",Medium,telemetry,ops,,guy@intelgraph.dev,2025.12.r2,"Sprint 23 (Dec 15–26, 2025)",2025-12-19,IG-<parent>
```

---

## 4) Branching Plan
- Branch: `feature/collab-and-motifs-v1`
- Integration branches: `feat/presence-typing`, `feat/comments-threads`, `feat/mentions-notify`, `feat/motif-triangles`, `feat/motif-venue`, `feat/motif-bursts`, `feat/motif-chips-alerts`, `feat/er-clustering`, `feat/unmerge-boundaries`, `feat/notify-qos`, `feat/motif-panels`.

---

## 5) Architecture Delta (ASCII)
```text
Case Spaces (collab)
  ├─ Presence/Typing (WS)
  ├─ Comments & Threads (WS + audit)
  └─ @Mentions → Notify (WS + webhook)
      │
      ▼
Tri‑pane UI ← Motif Chips (temporal triangles, venue co‑occurrence, cross‑channel bursts)
      │
      ▼
Server
  ├─ analytics/motifs/*
  ├─ alerts/motifs
  ├─ er-service/cluster (hierarchical, closure)
  └─ policy/opa/unmerge_boundary.rego

Observability: Notify QoS panels; Motif job dashboards; error budgets.
```

---

## 6) Code Scaffolding (drop‑in files)
### 6.1 Presence & Typing (web)
```tsx
// apps/web/src/features/case-space/presence.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';
import io from 'socket.io-client';

export default function Presence({ caseId, me }:{ caseId:string; me:{id:string,name:string} }){
  const [users, setUsers] = useState<any[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  useEffect(()=>{
    const sock = io('/ws/case', { query:{ caseId } });
    sock.emit('join', { caseId });
    sock.on('presence:update', (list:any[]) => setUsers(list));
    $(document).on('ig:typing', (_e, st) => { sock.emit('typing', { caseId, state: st }); });
    sock.on('typing', ({ userId, state }) => setTyping((t)=>({ ...t, [userId]: state })));
    return () => { sock.disconnect(); $(document).off('ig:typing'); };
  }, [caseId]);
  return (
    <div className="flex -space-x-2">
      {users.map(u => (
        <div key={u.id} title={u.name} className="w-8 h-8 rounded-full bg-gray-200 border shadow relative">
          {typing[u.id] && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs">…</span>}
        </div>
      ))}
    </div>
  );
}
```

### 6.2 Comments & Threads (web)
```tsx
// apps/web/src/features/case-space/comments.tsx
import React, { useEffect, useState } from 'react';
import $ from 'jquery';
import io from 'socket.io-client';

export default function Comments({ caseId, targetId }:{ caseId:string; targetId:string }){
  const [items, setItems] = useState<any[]>([]);
  useEffect(()=>{
    const sock = io('/ws/case', { query:{ caseId } });
    sock.on('comment:new', (c:any)=> setItems((a)=>[...a,c]));
    return () => sock.disconnect();
  }, [caseId]);
  function send(text:string){ $.ajax({ url:'/api/case/comment', method:'POST', contentType:'application/json', data: JSON.stringify({ caseId, targetId, text })}); }
  return (
    <div>
      {items.map((c)=> <div key={c.id} className="rounded-2xl p-2 shadow mb-2"><b>{c.user?.name}</b>: {c.text}</div>)}
      <input className="rounded-2xl p-2 shadow w-full" placeholder="Write a comment… @mention"
             onKeyDown={(e:any)=>{ if(e.key==='Enter'){ send(e.target.value); e.target.value=''; } }} />
    </div>
  );
}
```

### 6.3 @Mentions & Notifications (server)
```ts
// server/src/notify/index.ts
import { Server } from 'socket.io';
import fetch from 'node-fetch';
export function createNotifier(io: Server){
  async function notifyWS(userId:string, payload:any){ io.to(`user:${userId}`).emit('notify', payload); }
  async function notifyEmail(webhook:string, payload:any){ await fetch(webhook, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) }); }
  return { notifyWS, notifyEmail };
}
```

### 6.4 Motif: Temporal Triangles
```ts
// server/src/analytics/motifs/temporal_triangles.ts
import dayjs from 'dayjs';
export type Triangle = { a:string; b:string; c:string; windowDays:number; score:number; why:string };
export async function findTemporalTriangles(events:{when:string,src:string,dst:string,venue?:string}[], days:number): Promise<Triangle[]>{
  const cutoff = dayjs().subtract(days,'day');
  const E = events.filter(e=>dayjs(e.when).isAfter(cutoff));
  // naive O(n^2) → replace with indexed approach
  const tri: Triangle[] = [];
  for (let i=0;i<E.length;i++) for (let j=i+1;j<E.length;j++) for (let k=j+1;k<E.length;k++){
    const s = new Set([E[i].src,E[i].dst,E[j].src,E[j].dst,E[k].src,E[k].dst]);
    if (s.size===3) tri.push({ a:[...s][0] as string, b:[...s][1] as string, c:[...s][2] as string, windowDays: days, score: 0.8, why: '3‑cycle within window' });
  }
  return tri.slice(0,50);
}
```

### 6.5 Motif Chips (web)
```tsx
// apps/web/src/features/tri-pane/motif-chips.tsx
import React from 'react';
import $ from 'jquery';
export default function MotifChips({ motifs }:{ motifs:any[] }){
  return (
    <div className="absolute top-2 left-2 flex flex-wrap gap-2">
      {motifs.map(m => (
        <button key={m.name} className="rounded-2xl px-3 py-1 shadow" onClick={()=> $(document).trigger('ig:motif:select', m)}>
          {m.name} • {Math.round((m.score||0)*100)}
        </button>
      ))}
    </div>
  );
}
```

### 6.6 ER Clustering (Python skeleton)
```python
# er-service/cluster/build.py
import networkx as nx

def build_clusters(pairs):
    G = nx.Graph()
    for a,b,prob in pairs:
        if prob < 0.9: continue
        G.add_edge(a,b,weight=prob)
    clusters = list(nx.connected_components(G))
    return [list(c) for c in clusters]
```

### 6.7 Unmerge Boundaries (server)
```ts
// server/src/graph/unmerge_boundary.ts
export function withinBoundary(clusterId:string, nodeA:string, nodeB:string){
  // placeholder boundary rule
  return nodeA.startsWith(clusterId) && nodeB.startsWith(clusterId);
}
```

### 6.8 OPA Policy — Unmerge Boundary
```rego
# SECURITY/policy/opa/unmerge_boundary.rego
package unmerge_boundary

default allow = false

allow if {
  input.user.role in {"Admin","DataSteward"}
  input.action == "Unmerge"
  input.resource.clusterId != ""
  input.resource.withinBoundary == true
}
```

---

## 7) Observability (Grafana Panels)
```json
{
  "title": "IntelGraph — Collab & Motifs",
  "panels": [
    {"type":"stat","title":"Notify p95 (ms)","targets":[{"expr":"histogram_quantile(0.95, sum(rate(notify_latency_ms_bucket[5m])) by (le))"}]},
    {"type":"graph","title":"Motif Job Duration (ms)","targets":[{"expr":"sum(rate(motif_job_duration_ms_sum[5m])) / sum(rate(motif_job_duration_ms_count[5m]))"}]}
  ]
}
```

---

## 8) CI/CD Deltas
```yaml
# .github/workflows/collab-motifs.yml
name: collab-motifs
on: [pull_request]
jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run -w apps/web build
  server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test -w server
  er_cluster:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install networkx pytest
      - run: pytest -q er-service/cluster
```

---

## 9) Helm Values (S23)
```yaml
# helm/server/values.sprint23.yaml
features:
  presence: true
  comments: true
  mentions: true
  motifs: ["temporal_triangles","venue_cooccur","cross_channel_bursts"]
notify:
  wsEnabled: true
  emailWebhook: "${NOTIFY_WEBHOOK}"
```

---

## 10) Demo Script (2 min)
1) Open Case Space → presence avatars appear, typing indicator pulses.  
2) Comment on a cluster and @mention a teammate → they receive WS toast + email webhook payload.  
3) Toggle **Temporal Triangles** motif → chips appear; click → explain card with “why this matters.”  
4) Run ER clustering on recent merges → view cluster lineage; attempt cross‑cluster unmerge → blocked by policy (explained).  
5) Show Notify p95 and Motif job duration panels staying green.

---

## 11) Risks & Mitigations
- **WS scale & fan‑out** → per‑room rate limits; backpressure; exponential backoff; alerting on queue depth.  
- **Motif false positives** → threshold tuning, human‑explainable chips, ability to snooze alerts; capture feedback.  
- **Unmerge boundary disputes** → explain policy rationale; override flow requiring admin + reason + audit.  
- **Holiday staffing risk** → scope buffers, feature flags, and canary toggles.

---

## 12) Seeds for Sprint 07
- Presence: @here, @channel; reactions; attachment previews.  
- Motifs: temporal 2‑hop cascades, community bridge detectors.  
- ER: cluster visualization + semi‑auto review queues.  
- Notifications: digest emails, mobile push provider abstraction.

