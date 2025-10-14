````markdown
# IntelGraph — Next Sprint Plan (v0.7.0)
**Slug:** `sprint-2025-10-13-intelgraph-v0-7`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2025-10-13 → 2025-10-24 (10 business days)  
**Theme:** **Production Hardening & Collaborative Intelligence** — real‑time co‑analysis, graph analytics at scale, zero‑trust enforcement, and operator ergonomics.

---
## 0) North Stars & DoD
- **Realtime First:** Multi‑user co‑editing with optimistic UI and conflict‑free merges; audit of presence & actions.
- **Explainable Analytics:** GDS results (communities, centrality, paths) with readable rationale + provenance.
- **Guarded Exports:** OPA‑enforced policies in `enforce` mode with appeal workflow integrated.
- **Ops SLOs:** p95 NL→Cypher cycle < 1.2s; p95 live graph ops < 1.0s on demo corpus; zero P0s.

**DoD Gate:**
1) Two analysts can co‑navigate tri‑pane, leave annotations, and see presence cursors.  
2) GDS analytics run via jobs, cache results, and render in UI with explanations.  
3) OPA policies gate exports in **enforce** mode; appeals logged and reviewable.  
4) SLOs evidenced in Grafana; runbooks updated; load test passes.

---
## 1) Epics → Objectives
1. **Realtime Collaboration (COLL‑E1)** — Presence, annotations, pinboards w/ locking, activity feed, audit.
2. **Graph Analytics at Scale (GDS‑E2)** — Community detection, PageRank, shortest paths, persistence, diffing.
3. **Zero‑Trust Enforcement (ZTT‑E3)** — OPA enforce mode + ABAC expansion; reason‑for‑access improvements.
4. **Operator Ergonomics (OPS‑E4)** — SLO tuning, slow‑query hints UI, Helm autoscaling, log taxonomy.
5. **Quality & Docs (QA‑E5)** — Golden‑path playbooks, E2E + perf tests, demo narrative and data.

---
## 2) Swimlanes
### Frontend (React + MUI + Cytoscape.js + jQuery)
- Presence cursors, selection mirrors, and comment threads on nodes/edges.
- Realtime pinboard (Socket.IO) with CRDT‑like merges and lock tokens.
- Analytics panel: run, view, compare results; chips to filter graph by community/score.
- Export dialog: policy preview, denial reasons, appeal link.

### Backend (Node/Express + Apollo + Redis + Neo4j)
- Collaboration service (Socket.IO) with room ACLs + presence + moderation.
- Analytics job runner w/ BullMQ; GDS Cypher invocations and results persistence.
- OPA enforce path + ABAC attributes expansion (case role, sensitivity, license lineage).
- Metrics, budgets, and slow‑query recommendations service.

### Ops/SRE & Security
- HPA for server & worker; Grafana panels for collaboration latency, message fan‑out, GDS durations.
- Log taxonomy (Elastic/OTel) and correlation IDs across GraphQL, Socket.IO, jobs.

### QA/Docs
- Playwright multi‑client scenarios; k6 WS + HTTP mix; demo script & screenshots; operator playbook updates.

---
## 3) Sprint Backlog (Stories, AC, Points)
> **S=1, M=3, L=5, XL=8** | Target ≈ 85 pts

### Collaboration (27 pts)
1. Presence cursors & selection mirroring in tri‑pane.  
   **AC:** Cursor/selection visible within 150ms p95; role‑based colors; toggle in settings. (**L**)
2. Node/edge comments with @mentions and RBAC visibility.  
   **AC:** Markdown subset; audit log of edits/deletes; mention notifications via activity feed. (**L**)
3. Pinboard locking & conflict resolution.  
   **AC:** Soft locks with 10s TTL; last‑writer‑wins on equal ts; admin override; audit entries. (**M**)

### Graph Analytics (29 pts)
4. Community detection (Louvain/Leiden) job with cached overlays.  
   **AC:** Job completes < 60s for 250k edges on demo cluster; overlay chip filters < 200ms. (**XL**)
5. PageRank + betweenness centrality with explainers.  
   **AC:** Top‑k nodes list; tooltip explanations; provenance lineage. (**L**)
6. K‑shortest paths (Yen) bounded by policies.  
   **AC:** Paths limited by ABAC; UI shows blocked edges with reason. (**M**)

### Zero‑Trust Enforcement (15 pts)
7. OPA enforce mode for exports with appeals queue.  
   **AC:** Denials must cite policy & evidence; appeal creates review task; metrics panel. (**M**)
8. ABAC attributes expansion (case sensitivity, data license, clearance).  
   **AC:** Attributes required in context; tests cover deny/allow matrix. (**M**)

### Ops & Cost (8 pts)
9. Helm HPA & budgets surfaced in Admin UI.  
   **AC:** HPA targets CPU 70%; job concurrency sliders; hints stored. (**M**)

### QA/Docs (6 pts)
10. Multi‑client Playwright E2E (2 users collaboration).  
    **AC:** Flake < 1%; artifacts saved; CI gating. (**M**)
11. Demo narrative & operator playbooks updated.  
    **AC:** 15‑min demo flow; rollback guide. (**S**)

---
## 4) Scaffolds & Code Snippets

### 4.1 Socket.IO server (presence, rooms, moderation)
```ts
// server/src/collab/socket.ts
import { Server } from 'socket.io'
import http from 'http'

export function attachCollab(server: http.Server) {
  const io = new Server(server, { cors: { origin: /localhost|intelgraph\.internal/ } })

  io.use((socket, next) => {
    const user = authenticate(socket.handshake.auth?.token)
    if (!user) return next(new Error('unauthorized'))
    ;(socket as any).user = user
    next()
  })

  io.on('connection', socket => {
    const user = (socket as any).user

    socket.on('join', ({ caseId }) => {
      if (!canJoin(user, caseId)) return socket.emit('error', 'forbidden')
      socket.join(caseId)
      io.to(caseId).emit('presence', { user: redact(user), t: Date.now(), kind: 'join' })
    })

    socket.on('cursor', ({ caseId, pane, x, y }) => {
      if (!socket.rooms.has(caseId)) return
      socket.to(caseId).emit('cursor', { uid: user.id, pane, x, y, t: Date.now() })
    })

    socket.on('comment', msg => handleComment(io, socket, msg))
    socket.on('pinboard', msg => handlePinboard(io, socket, msg))

    socket.on('disconnect', () => {
      // emit leave
    })
  })

  return io
}
````

### 4.2 jQuery client hooks for presence & comments

```js
// apps/web/src/collab/jquery-hooks.js
$(function(){
  const socket = io({ auth: { token: window.jwt } })
  socket.emit('join', { caseId: window.caseId })

  $('#graph').on('mousemove', function(e){
    socket.emit('cursor', { caseId: window.caseId, pane: 'graph', x: e.pageX, y: e.pageY })
  })

  $(document).on('submit', '#comment-form', function(e){
    e.preventDefault()
    const payload = { caseId: window.caseId, target: $('#targetId').val(), text: $('#commentText').val() }
    socket.emit('comment', payload)
  })
})
```

### 4.3 GDS jobs (Cypher)

```cypher
// Community detection (Leiden)
CALL gds.graph.project(
  'case-$caseId',
  { Entity: { label: 'Entity', properties: 'type' } },
  { RELATED: { type: 'RELATED', orientation: 'UNDIRECTED', properties: ['weight'] } }
);
CALL gds.leiden.stream('case-$caseId', { includeIntermediateCommunities: false })
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS n, communityId
MERGE (n)-[r:ANALYTIC{ kind:'community', runId:$runId }]->(:Analytic { id:$runId })
SET r.value = communityId, r.createdAt = datetime();
```

### 4.4 Export gate (OPA enforce integration)

```ts
// server/src/provenance/export-gate.ts
import { evaluate } from '../policy/opa'
export async function guardExport(ctx, bundle){
  const decision = await evaluate('intelgraph/export/allow', { user: ctx.user, export: bundle.meta })
  if (!decision.allow) {
    await queueAppeal(ctx.user, decision)
    throw new Error(`ExportDenied:${decision.reason}`)
  }
}
```

### 4.5 Admin HPA controls (Helm values)

```yaml
# ops/helm/values.v0.7.yaml
server:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 70
worker:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 12
```

### 4.6 Observability taxonomy

```yaml
trace:
  attributes:
    - request.id
    - user.id (pseudonymized)
    - case.id
    - job.id
log:
  levels: [debug, info, warn, error]
  fields: [ts, sev, svc, route, rid, cid, uid, msg]
```

### 4.7 Playwright (multi‑client E2E)

```ts
// tests/e2e/collab.spec.ts
import { test, expect } from '@playwright/test'

test('two users see each other and comment', async ({ browser }) => {
  const u1 = await browser.newPage(); const u2 = await browser.newPage()
  await u1.goto('/case/123'); await u2.goto('/case/123')
  await u1.locator('#graph').hover()
  await expect(u2.locator('.presence')).toBeVisible()
  await u1.fill('#commentText', 'Check node A')
  await u1.click('#commentSubmit')
  await expect(u2.getByText('Check node A')).toBeVisible()
})
```

### 4.8 k6 — WebSocket + HTTP mix

```js
import ws from 'k6/ws'
import http from 'k6/http'
export const options = { vus: 30, duration: '3m' }
export default function(){
  ws.connect('wss://localhost/collab', { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } }, function(socket){
    socket.on('open', function(){ socket.send(JSON.stringify({ type:'join', caseId:'123' })) })
    socket.setTimeout(function(){ socket.close() }, 5000)
  })
  http.post('http://localhost:4000/graphql', JSON.stringify({ query: '{ health }' }), { headers: { 'Content-Type': 'application/json' }})
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Socket scaffolds, presence & selections; initial tests.
- **D3–D4:** Comments + pinboard locks; audit logging; activity feed.
- **D5–D6:** GDS jobs + overlays + explanations; cache + diffing.
- **D7:** OPA enforce + appeals; Admin HPA UI.
- **D8:** SLO tuning; slow‑query hints UI.
- **D9–D10:** E2E, perf, docs, demo polish.

---

## 6) Risks & Mitigations

- **Fan‑out latency under load** → sticky rooms, batched presence updates, backpressure.
- **GDS compute cost** → sampled previews, time‑boxed jobs, result caching, budget hints.
- **Policy false negatives** → shadow mode in staging, policy tests, ombuds dry‑run.
- **Test flakiness** → deterministic seeds, network idle waits, retries.

---

## 7) Metrics

- Presence latency; WS reconnect rate; GDS job durations; cache hit rate; export denials/appeals; SLO compliance; demo task time.

---

## 8) Release Artifacts

- **ADR‑014:** Collaboration model & audit schema.
- **ADR‑015:** GDS cache & overlay design.
- **RFC‑022:** Export appeals workflow.
- **Runbooks:** Collab incident handling; GDS capacity; OPA policy rollouts.
- **Docs:** Analyst collaboration guide; Admin autoscaling guide.

---

## 9) Definition of Ready

- Story has AC, security notes, telemetry hooks, data fixtures, owner, reviewer, rollout + rollback plan.

---

## 10) Branching, CI/CD & Labels

- Branch: `feature/realtime-collab`, `feature/gds-analytics`, `feature/opa-enforce`, `ops/hpa-admin`
- Labels: `area:collab`, `area:gds`, `type:feature`, `type:ops`, `security`, `needs-tests`, `blocked`
- PR Template: checklist for AC, tests, telemetry, docs, threat model delta.

---

## 11) Demo Script (15 min)

1. Two browsers join a case → presence cursors appear.
2. Comment on a node, @mention, see activity feed update.
3. Run community detection, overlay clusters; filter to cluster 12; show PageRank top‑k.
4. Attempt export blocked by OPA; view denial reason; submit appeal; show admin queue.
5. Grafana panel review: SLOs for WS latency, GDS durations; HPA scale‑out during demo.

---

## 12) Out‑of‑Scope (backlog)

- Offline collaboration; CRDT persistence; cross‑tenant federation; mobile UI; red‑team simulations; zero‑knowledge proofs.

```
```
