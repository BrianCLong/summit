# Merge Adjudication Queue (B‑ER‑010)

**Goal:** Non‑destructive ER adjudication with explainability (feature attribution), approve/reject/soft‑split, full audit + undo.

**Repo paths (proposed):**
```
services/er/
  src/
    api/
      schema.er.graphql
      resolvers.er.ts
    core/
      adjudication.ts          # business logic (approve/reject/soft‑split/undo)
      explain.ts               # feature attribution → XAI payload
      queue.ts                 # fetch/claim/complete queue items
      audit.ts                 # provenance + audit ledger writes
      neo4j.ts                 # SAME_AS edges (non‑destructive), tx helpers
      rls.ts                   # per‑tenant context helpers
    db/
      sql/
        20251006_er_queue.sql  # migrations + RLS
    __tests__/
      er.adjudication.test.ts
      er.queue.test.ts
apps/web/src/features/er/
  AdjudicationPane.tsx
  QueueTable.tsx
  DetailsPanel.tsx
  XaiChips.tsx
  UndoToast.tsx
  api.ts
policies/er.rego
.github/workflows/er-tests.yml
```

---

## 1) Data Model & Migrations (Postgres + RLS)

**Design:** Decisions are immutable records. Merges are **virtual** via `SAME_AS` relationships in Neo4j and a Canonical ID mapping in Postgres. Undo creates a compensating decision and deactivates the link.

```sql
-- file: services/er/src/db/sql/20251006_er_queue.sql
BEGIN;

CREATE TABLE IF NOT EXISTS er_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  left_entity_id TEXT NOT NULL,
  right_entity_id TEXT NOT NULL,
  model_score NUMERIC NOT NULL,
  features JSONB NOT NULL,            -- raw feature vector
  attributions JSONB,                  -- optional precomputed SHAP/weights
  band TEXT NOT NULL DEFAULT 'mid',    -- low|mid|high (B-ER-011 consumes)
  status TEXT NOT NULL DEFAULT 'queued', -- queued|claimed|completed|skipped
  claimed_by TEXT,                     -- user id
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS er_decision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  queue_id UUID REFERENCES er_queue(id) ON DELETE SET NULL,
  left_entity_id TEXT NOT NULL,
  right_entity_id TEXT NOT NULL,
  decision TEXT NOT NULL,             -- approve|reject|soft_split|undo
  reason TEXT,                         -- human note
  xai JSONB,                           -- feature attribution snapshot
  actor TEXT NOT NULL,                 -- user id
  policy_version TEXT NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMPTZ,
  undo_of UUID,                        -- points to er_decision(id)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS er_canonical_map (
  tenant_id TEXT NOT NULL,
  canonical_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, canonical_id, entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_er_queue_tenant_status ON er_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_er_decision_tenant_created ON er_decision(tenant_id, created_at);

-- Row Level Security
ALTER TABLE er_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE er_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE er_canonical_map ENABLE ROW LEVEL SECURITY;

-- Expect app to set: SELECT set_config('app.tenant', '<tenant>', true);
CREATE POLICY er_queue_isolation ON er_queue USING (tenant_id = current_setting('app.tenant'));
CREATE POLICY er_decision_isolation ON er_decision USING (tenant_id = current_setting('app.tenant'));
CREATE POLICY er_canonical_isolation ON er_canonical_map USING (tenant_id = current_setting('app.tenant'));

-- Write policies restrict to same tenant as context
CREATE POLICY er_queue_write ON er_queue FOR ALL USING (tenant_id = current_setting('app.tenant')) WITH CHECK (tenant_id = current_setting('app.tenant'));
CREATE POLICY er_decision_write ON er_decision FOR ALL USING (tenant_id = current_setting('app.tenant')) WITH CHECK (tenant_id = current_setting('app.tenant'));
CREATE POLICY er_canonical_write ON er_canonical_map FOR ALL USING (tenant_id = current_setting('app.tenant')) WITH CHECK (tenant_id = current_setting('app.tenant'));

COMMIT;
```

---

## 2) GraphQL Schema (schema.er.graphql)
```graphql
scalar JSON

"Feature attribution explanation for transparency"
type XAIAttribution { feature: String!, weight: Float!, value: JSON }

type ERQueueItem {
  id: ID!
  leftEntityId: ID!
  rightEntityId: ID!
  modelScore: Float!
  band: String!
  attributions: [XAIAttribution!]!
  createdAt: String!
}

type ERDecision {
  id: ID!
  queueId: ID
  leftEntityId: ID!
  rightEntityId: ID!
  decision: String!
  actor: ID!
  reason: String
  xai: [XAIAttribution!]
  executed: Boolean!
  executedAt: String
  policyVersion: String!
}

input ClaimOptions { limit: Int = 25 }

input AdjudicateInput {
  queueId: ID!
  decision: String! # approve|reject|soft_split
  reason: String
}

input UndoInput { decisionId: ID!, reason: String }

extend type Query {
  erQueue(band: String = "mid"): [ERQueueItem!]! @opa(policy: "er.read")
}

extend type Mutation {
  erClaim(options: ClaimOptions): [ERQueueItem!]! @opa(policy: "er.claim")
  erAdjudicate(input: AdjudicateInput!): ERDecision! @opa(policy: "er.decide")
  erUndo(input: UndoInput!): ERDecision! @opa(policy: "er.undo")
}
```

---

## 3) Rego (policies/er.rego)
```rego
package intelgraph.er

policy_version := "1.0.0"

default allow := false

allow {
  input.action == "er.read"
  input.user.scopes[_] == "er:read"
}

allow {
  input.action == "er.claim"
  input.user.scopes[_] == "er:claim"
}

allow {
  input.action == "er.decide"
  input.user.scopes[_] == "er:write"
  not sensitive_requires_stepup
}

allow {
  input.action == "er.undo"
  input.user.scopes[_] == "er:admin"
}

sensitive_requires_stepup {
  input.env.step_up_enabled
  not input.user.webauthn_verified
}

result := {"allow": allow, "policy_version": policy_version}
```

---

## 4) Service Core (TypeScript)

### `core/explain.ts` — turn features → XAI chips
```ts
export type FeatureVector = Record<string, number | string | boolean>;
export type Attribution = { feature: string; weight: number; value: unknown };

export function attributionsFromWeights(features: FeatureVector, weights: Record<string, number>): Attribution[] {
  return Object.keys(features).map(k => ({ feature: k, value: features[k], weight: weights[k] ?? 0 }))
    .sort((a,b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 8);
}
```

### `core/neo4j.ts` — SAME_AS edges (non‑destructive)
```ts
import neo4j, { Driver } from 'neo4j-driver';

export async function linkSameAs(driver: Driver, leftId: string, rightId: string) {
  const s = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await s.run(`
      MATCH (a {id: $left}), (b {id: $right})
      MERGE (a)-[r:SAME_AS {active: true}]->(b)
      ON MATCH SET r.active = true, r.updatedAt = timestamp()
      RETURN id(r) as rid
    `, { left: leftId, right: rightId });
  } finally { await s.close(); }
}

export async function unlinkSameAs(driver: Driver, leftId: string, rightId: string) {
  const s = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await s.run(`
      MATCH (a {id: $left})-[r:SAME_AS]->(b {id: $right})
      SET r.active = false, r.updatedAt = timestamp()
    `, { left: leftId, right: rightId });
  } finally { await s.close(); }
}
```

### `core/adjudication.ts`
```ts
import { Pool } from 'pg';
import { linkSameAs, unlinkSameAs } from './neo4j';
import { attributionsFromWeights } from './explain';

export interface Ctx { tenant: string; userId: string; policyVersion: string; pg: Pool; neo4j: any; weights?: Record<string, number> }

export async function claimQueue(ctx: Ctx, limit = 25, band = 'mid') {
  const c = await ctx.pg.connect();
  try {
    await c.query("SET LOCAL app.tenant = $1", [ctx.tenant]);
    const { rows } = await c.query(
      `UPDATE er_queue SET status='claimed', claimed_by=$2, updated_at=now()
       WHERE id IN (
         SELECT id FROM er_queue WHERE tenant_id=$1 AND status='queued' AND band=$3 ORDER BY created_at ASC LIMIT $4
       ) RETURNING *`, [ctx.tenant, ctx.userId, band, limit]);
    return rows;
  } finally { c.release(); }
}

export async function adjudicate(ctx: Ctx, queueId: string, decision: 'approve'|'reject'|'soft_split', reason?: string) {
  const c = await ctx.pg.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL app.tenant = $1", [ctx.tenant]);
    const q = await c.query('SELECT * FROM er_queue WHERE id=$1 FOR UPDATE', [queueId]);
    if (!q.rowCount) throw new Error('queue item not found');
    const item = q.rows[0];
    const xai = attributionsFromWeights(item.features, ctx.weights || {});

    if (decision === 'approve') await linkSameAs(ctx.neo4j, item.left_entity_id, item.right_entity_id);
    if (decision === 'soft_split') await unlinkSameAs(ctx.neo4j, item.left_entity_id, item.right_entity_id);

    const d = await c.query(
      `INSERT INTO er_decision (tenant_id, queue_id, left_entity_id, right_entity_id, decision, reason, xai, actor, policy_version, executed, executed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now()) RETURNING *`,
      [ctx.tenant, queueId, item.left_entity_id, item.right_entity_id, decision, reason ?? null, JSON.stringify(xai), ctx.userId, ctx.policyVersion]
    );

    await c.query('UPDATE er_queue SET status=$2, updated_at=now() WHERE id=$1', [queueId, 'completed']);
    await c.query('COMMIT');
    return d.rows[0];
  } catch (e) { await c.query('ROLLBACK'); throw e } finally { c.release(); }
}

export async function undo(ctx: Ctx, decisionId: string, reason?: string) {
  const c = await ctx.pg.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL app.tenant = $1", [ctx.tenant]);
    const d = await c.query('SELECT * FROM er_decision WHERE id=$1 FOR UPDATE', [decisionId]);
    if (!d.rowCount) throw new Error('decision not found');
    const dec = d.rows[0];

    // Compensate effect
    if (dec.decision === 'approve') await unlinkSameAs(ctx.neo4j, dec.left_entity_id, dec.right_entity_id);
    if (dec.decision === 'reject' || dec.decision === 'soft_split') await linkSameAs(ctx.neo4j, dec.left_entity_id, dec.right_entity_id);

    const ins = await c.query(
      `INSERT INTO er_decision (tenant_id, queue_id, left_entity_id, right_entity_id, decision, reason, xai, actor, policy_version, executed, executed_at, undo_of)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now(),$10) RETURNING *`,
      [ctx.tenant, dec.queue_id, dec.left_entity_id, dec.right_entity_id, 'undo', reason ?? null, dec.xai, ctx.userId, ctx.policyVersion, decisionId]
    );
    await c.query('COMMIT');
    return ins.rows[0];
  } catch (e) { await c.query('ROLLBACK'); throw e } finally { c.release(); }
}
```

### `api/resolvers.er.ts`
```ts
import { claimQueue, adjudicate, undo } from '../core/adjudication';

export default (deps: any) => ({
  Query: {
    async erQueue(_: any, { band }: any, ctx: any) {
      return deps.db.listQueue(ctx.tenant, band);
    }
  },
  Mutation: {
    async erClaim(_: any, { options }: any, ctx: any) {
      return claimQueue({ tenant: ctx.tenant, userId: ctx.user.sub, policyVersion: deps.policyVersion, pg: deps.pg, neo4j: deps.neo4j }, options?.limit ?? 25);
    },
    async erAdjudicate(_: any, { input }: any, ctx: any) {
      return adjudicate({ tenant: ctx.tenant, userId: ctx.user.sub, policyVersion: deps.policyVersion, pg: deps.pg, neo4j: deps.neo4j, weights: deps.weights }, input.queueId, input.decision, input.reason);
    },
    async erUndo(_: any, { input }: any, ctx: any) {
      return undo({ tenant: ctx.tenant, userId: ctx.user.sub, policyVersion: deps.policyVersion, pg: deps.pg, neo4j: deps.neo4j }, input.decisionId, input.reason);
    }
  }
});
```

---

## 5) Frontend — Tri‑Pane Adjudication

### UX Notes
- **Left pane:** Queue list with band filter, score, top‑3 XAI chips.
- **Center pane:** Details + comparison (left vs right) diffs and provenance.
- **Right pane:** Actions (Approve / Reject / Soft‑split) + reason input, Undo history.
- **A11y:** keyboard shortcuts (A/R/S/U), focus management.

### `apps/web/src/features/er/api.ts`
```ts
export async function fetchQueue(band = 'mid') {
  const q = `query($band: String){ erQueue(band: $band){ id leftEntityId rightEntityId modelScore band attributions{feature weight} createdAt } }`;
  return gql(q, { band });
}
export async function claim(limit = 25){ return gql(`mutation($l:Int){ erClaim(options:{limit:$l}){ id } }`, { l: limit }); }
export async function adjudicate(queueId: string, decision: string, reason?: string){ return gql(`mutation($q:ID!,$d:String!,$r:String){ erAdjudicate(input:{queueId:$q,decision:$d,reason:$r}){ id decision executed } }`, { q: queueId, d: decision, r: reason }); }
export async function undoDecision(decisionId: string, reason?: string){ return gql(`mutation($id:ID!,$r:String){ erUndo(input:{decisionId:$id,reason:$r}){ id decision executed } }`, { id: decisionId, r: reason }); }
```

### `QueueTable.tsx` (extract)
```tsx
import React from 'react';
export function QueueTable({ items, onSelect }:{ items:any[], onSelect:(id:string)=>void }){
  return (
    <div className="border rounded-2xl p-3">
      <table className="w-full text-sm">
        <thead><tr><th>ID</th><th>Score</th><th>Band</th><th>Top Signals</th></tr></thead>
        <tbody>
        {items.map(i => (
          <tr key={i.id} onClick={()=>onSelect(i.id)} className="cursor-pointer hover:bg-gray-50">
            <td className="font-mono text-xs">{i.id.slice(0,8)}</td>
            <td>{i.modelScore.toFixed(3)}</td>
            <td>{i.band}</td>
            <td>{i.attributions.slice(0,3).map((a:any)=> (
              <span key={a.feature} className="px-2 py-1 rounded-full text-xs mr-1 border">{a.feature}:{a.weight.toFixed(2)}</span>
            ))}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
```

### `DetailsPanel.tsx` (extract)
```tsx
export function DetailsPanel({ item, onApprove, onReject, onSoftSplit }:{ item:any, onApprove:()=>void, onReject:()=>void, onSoftSplit:()=>void }){
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Left</h4>
          <pre className="bg-gray-50 p-2 rounded-xl text-xs overflow-auto">{JSON.stringify(item.left, null, 2)}</pre>
        </div>
        <div>
          <h4 className="font-semibold">Right</h4>
          <pre className="bg-gray-50 p-2 rounded-xl text-xs overflow-auto">{JSON.stringify(item.right, null, 2)}</pre>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={onApprove}>Approve (A)</button>
        <button className="btn" onClick={onReject}>Reject (R)</button>
        <button className="btn" onClick={onSoftSplit}>Soft‑split (S)</button>
      </div>
    </div>
  );
}
```

---

## 6) Tests

### `__tests__/er.queue.test.ts`
```ts
import { Pool } from 'pg';
import { claimQueue } from '../src/core/adjudication';

test('claims items FIFO by created_at within band', async () => {
  const pg = new Pool({ connectionString: process.env.TEST_DB });
  const rows = await claimQueue({ tenant: 't1', userId: 'u1', policyVersion: 'test', pg, neo4j: {} as any }, 5, 'mid');
  expect(rows.length).toBeLessThanOrEqual(5);
});
```

### `__tests__/er.adjudication.test.ts`
```ts
import { adjudicate, undo } from '../src/core/adjudication';

test('approve creates SAME_AS and decision; undo reverses', async () => {
  // mock neo4j link/unlink
  const calls: string[] = [];
  const neo4j = { link:()=>calls.push('link'), unlink:()=>calls.push('unlink') } as any;
  // ... create queue item fixture ...
  // assert adjudicate → link; undo → unlink
});
```

---

## 7) Observability
- Metrics (Prometheus):
  - `er_queue_claim_total{tenant,actor}`
  - `er_decision_total{tenant,decision}`
  - `er_undo_total{tenant}`
  - `er_xai_top_weight{tenant,feature}` (gauge sample)
- Logs: include `policy_version`, `queue_id`, `decision_id`, `reasons`.
- Traces: span `er.adjudicate` with Neo4j/PG child spans.

---

## 8) PR Description Snippet
```
feat(er): Merge Adjudication Queue (B-ER-010)
- Non-destructive ER with SAME_AS edges and canonical map
- Queue claim/complete, approve/reject/soft-split, undo
- XAI feature chips and full audit; RLS enforced
- GraphQL schema + UI tri-pane components
```

---

## 9) Runbook (excerpt)
- On policy over-blocking, flip **Stage simulate** and capture `/simulate` responses.
- Undo is compensating and idempotent; safe to repeat.
- For destructive merges, **not supported** here—must go through data steward bulk ops with separate approval.

