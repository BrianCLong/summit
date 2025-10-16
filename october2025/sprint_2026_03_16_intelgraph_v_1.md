````markdown
# IntelGraph — Edge Kits, Offline Field Ops & Selective Disclosure Sprint (v1.7.0)

**Slug:** `sprint-2026-03-16-intelgraph-v1-7`  
**Date Created:** 2025-09-29 (America/Denver)  
**Sprint Window:** 2026-03-16 → 2026-03-27 (10 business days)  
**Theme:** **Operate Anywhere** — lightweight **Edge Kit** for air‑gapped/low‑connectivity use, **offline-first** case work, and **selective disclosure** exports with cryptographic proofs.

---

## 0) North Stars & DoD

- **Offline‑first:** Analysts can open a case, collect evidence, take notes, run local queries, and later **sync with conflict resolution**.
- **Edge Kit:** Single‑node bundle (Neo4j/SQLite/mini‑API) with push/pull replication and signed snapshots.
- **Selective Disclosure:** Export minimal facts with **BBS+ proof** or Merkle‑subset over provenance to reveal only what’s needed.
- **SLOs:** Initial sync ≤ 90s for 10k nodes/edges; offline query p95 < 800ms; export proof verify < 300ms.

**DoD Gate:**

1. Demo: field laptop runs Edge Kit → collects evidence offline → creates local insights → syncs to HQ with conflict merges and audit.
2. Selective disclosure export verifies (verifier CLI); tamper fails.
3. Admin can revoke an Edge device; subsequent syncs denied with reason; data shred protocol executed.

---

## 1) Epics → Objectives

1. **Edge Kit (EDGE‑E1)** — Dockerized mini‑stack (Neo4j‑lite/SQLite + mini GraphQL) + replicator + signed snapshots.
2. **Offline‑First Case Work (OFF‑E2)** — Local cache, mutation queue, CRDT notes, evidence stash, sync UI & conflict merges.
3. **Selective Disclosure (DISC‑E3)** — Proof‑carrying exports (Merkle subset / BBS+); verifier CLI; policy gates.
4. **Device Trust & Revocation (TRST‑E4)** — Device registry, attestation token, revocation & shred workflows.
5. **Ops/QA/Docs (OPS‑E5)** — Sync metrics, soak tests (lossy links), operator playbooks, field guide.

---

## 2) Swimlanes

### Frontend (React + MUI + jQuery)

- Offline banner/state; mutation queue drawer; conflict merge modals; sync button & status.
- Edge Packager UI (build/download Edge Kit bundle with tenant keys and case scope).
- Selective disclosure export wizard (field picker, policy preview, proof bundle).

### Backend (Node/Express + Apollo + Neo4j + SQLite + Replicator)

- Edge mini‑API (subset of GraphQL) backed by Neo4j (or SQLite for metadata); local evidence store.
- Replicator (HQ↔Edge): pull since cursor, push with CRDT merges; signature checks.
- Proof exporters (Merkle subset / BBS+ placeholder) + verifier.
- Device registry (enroll, attest, revoke) with signed tokens.

### Ops/SRE & Security

- Sync metrics (latency, bytes, conflicts); lossy network emulation; device key rotation; encrypted snapshot storage.

### QA/Docs

- Lossy‑link soak tests; offline E2E; device revoke tests; field ops guide; operator runbooks.

---

## 3) Sprint Backlog (Stories, AC, Points)

> **S=1, M=3, L=5, XL=8** | Target ≈ **90 pts**

### Edge Kit (30 pts)

1. Edge bundle builder (Docker) with mini‑API + Neo4j‑lite/SQLite.  
   **AC:** Single command builds bundle; config by ENV; runs on x86_64; healthcheck OK. (**L**)
2. Snapshot signer & loader.  
   **AC:** Edge creates signed snapshot; HQ verifies; load/restore path documented. (**M**)
3. Replicator (pull & push) with cursors.  
   **AC:** Pull since cursor; push mutations idempotently; conflict markers. (**XL**)

### Offline‑First Case Work (28 pts)

4. Local cache + mutation queue.  
   **AC:** Works offline; queue replays on reconnect; retry/backoff; telemetry. (**L**)
5. CRDT notes & pinboards.  
   **AC:** Last‑writer‑wins w/ clock skew tolerance; merge UI with diffs; audit trail. (**L**)
6. Evidence stash (local) + later upload.  
   **AC:** Hashes retained; policy re‑checked on upload; provenance chain continuous. (**M**)

### Selective Disclosure (22 pts)

7. Merkle‑subset export (proof of inclusion).  
   **AC:** Export includes leaf subset + auth path; verifier validates in < 300ms. (**L**)
8. BBS+ proof placeholder (API & CLI).  
   **AC:** API shapes defined; CLI stub returns simulated proof; swap‑in ready. (**M**)

### Device Trust (8 pts)

9. Device registry + revoke & shred workflow.  
   **AC:** Revocation blocks sync; shred command wipes local cache; audit entries. (**M**)

### QA/Docs (2 pts)

10. Offline/soak E2E + field guide.  
    **AC:** CI job simulates lossy link; guide published. (**S**)

---

## 4) Scaffolds & Code

### 4.1 Edge Compose (Docker)

```yaml
# edge/compose.yaml
services:
  api:
    image: intelgraph/edge-api:1.7
    env_file: .env.edge
    ports: ['127.0.0.1:4100:4100']
    depends_on: [db]
  db:
    image: neo4j:5-community
    environment:
      - NEO4J_AUTH=none
    volumes:
      - ./data:/data
```
````

### 4.2 Mini GraphQL (Edge)

```ts
// edge/api/index.ts
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import typeDefs from './schema';
import resolvers from './resolvers';
const app = express();
const srv = new ApolloServer({ typeDefs, resolvers });
await srv.start();
app.use(
  '/graphql',
  express.json(),
  expressMiddleware(srv, { context: async () => ({ edge: true }) }),
);
app.listen(4100);
```

### 4.3 Replicator — Pull & Push

```ts
// server/src/replicate/replicator.ts
export async function pullSince(cursor: string, ctx: any) {
  return ctx.driver.executeQuery(
    'MATCH (c:Change) WHERE c.ts > $c RETURN c ORDER BY c.ts ASC LIMIT 500',
    { c: cursor },
  );
}
export async function pushChanges(payload: any[], ctx: any) {
  for (const ch of payload) {
    await applyChange(ch, ctx);
  }
  return { ok: true };
}
```

### 4.4 Mutation Queue (Client)

```js
// apps/web/src/offline/mqueue.js
const q = [];
export function enqueue(m) {
  q.push({ m, ts: Date.now() });
}
export async function flush() {
  while (q.length) {
    const { m } = q[0];
    try {
      await $.ajax({
        url: '/graphql',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(m),
      });
      q.shift();
    } catch (e) {
      if (navigator.onLine) await new Promise((r) => setTimeout(r, 2000));
      else break;
    }
  }
}
window.addEventListener('online', flush);
```

### 4.5 CRDT Notes (LWW register)

```ts
// server/src/offline/crdt.ts
export type LWW = { value: string; ts: number; node: string };
export function mergeLWW(a: LWW, b: LWW) {
  return a.ts > b.ts || (a.ts === b.ts && a.node > b.node) ? a : b;
}
```

### 4.6 Selective Disclosure — Merkle Subset

```ts
// server/src/disclosure/merkle_subset.ts
export function proofOfInclusion(
  root: string,
  leaves: string[],
  path: string[][],
) {
  // verify: fold path hashes to reconstruct root
  return verify(root, leaves, path);
}
```

### 4.7 Disclosure Verifier CLI

```ts
// tools/ig-proof-verify.ts
#!/usr/bin/env node
import fs from 'fs'
import { verify } from '../server/src/disclosure/merkle_subset'
const b = JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
console.log(verify(b.root, b.leaves, b.paths)?'OK':'FAIL')
```

### 4.8 Device Registry & Revocation

```ts
// server/src/devices/registry.ts
export async function enrollDevice(id: string, pubkey: string, ctx: any) {
  await ctx.db.insert({ id, pubkey, status: 'active' });
}
export async function revokeDevice(id: string, ctx: any) {
  await ctx.db.update({ id }, { status: 'revoked' });
  await publishShredCommand(id);
}
```

### 4.9 Sync UI (jQuery)

```js
// apps/web/src/offline/jquery-sync.js
$(function () {
  $('#sync-now').on('click', function () {
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ query: 'mutation{ syncNow }' }),
    });
  });
  window.addEventListener('offline', () => $('#offline-banner').show());
  window.addEventListener('online', () => $('#offline-banner').hide());
});
```

### 4.10 k6 — Lossy Link Soak

```js
import http from 'k6/http';
export const options = { vus: 25, duration: '2h' };
export default function () {
  const payload = JSON.stringify({
    query: '{ pullSince(cursor:"2026-03-16T00:00:00Z"){ id } }',
  });
  http.post('http://edge.local:4100/graphql', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 5) Delivery Timeline

- **D1–D2:** Edge bundle + mini‑API; local cache & mutation queue.
- **D3–D4:** Replicator pull/push + cursors; CRDT notes; conflict UI.
- **D5–D6:** Selective disclosure export + verifier; evidence stash & late upload.
- **D7:** Device registry + revoke/shred; signed snapshots.
- **D8–D10:** Soak (lossy link), perf, docs, runbooks, demo polish.

---

## 6) Risks & Mitigations

- **Conflict storms** → CRDTs + merge UI + audit; backoff on hot cases.
- **Data exfiltration on Edge** → device attestation, signed snapshots, encrypted storage, revoke/shred.
- **Proof complexity** → start with Merkle subset, abstract for BBS+ later.
- **Sync latency** → cursors, deltas, compression, backpressure.

---

## 7) Metrics

- Sync latency/bytes/conflicts; offline queue length; merge success; proof verify time; device revokes; error budgets.

---

## 8) Release Artifacts

- **ADR‑034:** Edge Kit architecture & replication.
- **ADR‑035:** Offline‑first & conflict resolution model.
- **RFC‑032:** Selective disclosure proofs & verifier.
- **Runbooks:** Edge enroll/revoke; offline incident; sync backlog; proof failures.
- **Docs:** Field ops guide; selective disclosure how‑to; Edge admin.

---

## 9) Definition of Ready

- Story has AC, telemetry hooks, fixtures, owner, reviewer, rollout/rollback plan.

---

## 10) Demo Script (15 min)

1. Build Edge Kit; launch offline; collect evidence & notes; run local search.
2. Reconnect → sync; resolve conflicts in merge UI; audit shows merges.
3. Export selective disclosure with proof; run CLI verifier; tamper shows **FAIL**.
4. Revoke device; attempt sync → denied with reason; run shred; show audit trail and metrics.

---

## 11) Out‑of‑Scope (backlog)

- Full BBS+ implementation; cross‑Edge mesh sync; purpose‑binding at field level; offline analytics beyond cached overlays.

```

```
