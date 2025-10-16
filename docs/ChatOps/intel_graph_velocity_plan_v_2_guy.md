# IntelGraph — Highest‑Impact Velocity Plan (v2)

**Owner:** Guy (IntelGraph Platform Engineer)\
**Repo:** `github.com/BrianCLong/intelgraph`\
**Focus:** tie‑offs from v1 and accelerate multi‑user robustness, similarity search, performance, and security to production‑grade.

---

## 0) Tie‑offs from v1 (Definition of Done & Sign‑offs)

Mark each item as ✅ before closing v1.

- **Golden Path Gate**
  - ✅ Playwright E2E recorded as required GitHub status; runs on PR and `main`.
  - ✅ Deterministic seed data fixture and teardown verified.
  - ✅ Flake rate < 0.5% over last 50 runs.
- **GraphRAG v1 (Explainable)**
  - ✅ `graphRagAnswer` returns `{answer, confidence, citations, why_paths}`; JSON schema validated.
  - ✅ `why_paths` overlay working in client (Cytoscape edge highlighting) and covered by UI test.
  - ✅ Subgraph retrieval max p95 < 300ms on 10k edges; end‑to‑end p95 < 800ms.
- **OPA/ABAC Enforcement**
  - ✅ `withAuthAndPolicy` guard applied to all entity/relationship/investigation resolvers.
  - ✅ OPA unit tests + deny audit logs present; 100% policy paths covered.
- **Persisted Queries (Prod Only)**
  - ✅ Server rejects non‑allowlisted operations in prod; manifest shipped by CI.
  - ✅ Playground/Introspection disabled in prod; header‑based dev bypass only in non‑prod.
- **Observability Slice**
  - ✅ Apollo plugin emits resolver histograms; traces stitched API ↔ worker.
  - ✅ Grafana RED dashboards present; alert for p95 GraphQL > 800ms.
- **Security & Secrets**
  - ✅ SOPS‑managed secrets; no default dev creds when `REQUIRE_REAL_DBS=true`.
  - ✅ Token rotation and refresh flow verified (short TTL access, long TTL refresh).

> **Artifacts to attach to the release:** E2E run link, Grafana screenshots, OPA test report, PQ manifest checksum, SBOM + image scan.

---

## 1) Executive Summary (v2)

**Mission:** Upgrade IntelGraph for _investigator‑grade collaboration and speed_ by delivering real‑time consistency, semantic similarity search (ANN), and performance hardening. Complete a security hardening pass and add SLOs with actionable alerts.

**Outcome:** Multi‑user investigators can confidently co‑edit large graphs with low latency, discover look‑alikes via embeddings, and operate within clear SLOs.

---

## 2) High‑Velocity Priorities (Now → Next → Later)

### NOW (ship within this cycle)

1. **Realtime Consistency Layer**: LWW/CRDT policy, idempotent mutations, conflict telemetry, Socket.IO room hygiene.
2. **Embeddings ANN Search Online**: pgvector HNSW index + `similarEntities(text|entityId, topK)` GraphQL.
3. **Performance & Indexing**: Neo4j/PG indexes; server cache for neighborhood expansion; Cytoscape LOD hints.
4. **Security Hardening Pass**: rate limits, input validation via Zod on all resolvers, CSRF/headers, abuse monitoring.
5. **SLOs & Alerts**: define SLOs (p95s, error budgets), add alert rules and runbooks.

### NEXT (following cycle)

6. **Collaborative Presence & Draft Locking**: presence service, soft locks for destructive ops, activity timeline.
7. **Data Lifecycle & DLP**: retention policies, export redaction, PII tagging + access controls.
8. **Cost & Scale**: cache hit > 70%, background compaction, query budget analyzer, autoscaling policies.

### LATER (enterprise moat)

9. **Federated Connectors**: OSINT/SIEM/OTel adapters with provenance ledger + rate controls.
10. **Predictive Graph AI**: temporal GNN link prediction with evaluation harness, shadow‑mode first.

---

## 3) Workstreams & Deliverables

### A) Realtime Consistency

- **A1. Versioned Graph Ops**: server assigns `(v_clock: {ts, origin})`; LWW per node/edge; idempotency key via `x‑op‑id`.
- **A2. Conflict Resolver**: server arbitration for concurrent writes; client optimistic UI with rollback.
- **A3. Presence/Rooms**: `presence:{investigationId}` heartbeats; per‑inv Socket.IO rooms; backpressure and max fan‑out.

### B) Embeddings ANN & Similarity

- **B1. HNSW Index**: create pgvector HNSW; backfill embeddings; nightly consistency check.
- **B2. GraphQL API**: `similarEntities(entityId: ID, text: String, topK: Int!): [Entity!]!` with cosine distance & score.
- **B3. UI Finder**: “Find similar” action from node context menu; bulk select + add to investigation pane.

### C) Performance Hardening

- **C1. Neo4j Indexes & Query Hints**: composite indexes; relationship property indexes; profile hot queries.
- **C2. Server Cache**: Redis cache for `expandNeighborhood(entityId, radius)` with tag‑based invalidation.
- **C3. Cytoscape LOD**: hide labels on zoom‑out; throttle renders; server‑side community sampling for >50k elements.

### D) Security & Compliance

- **D1. Rate Limiting & Abuse**: per‑user/IP rate‑limits, anomaly counters, circuit‑breaker for hot queries.
- **D2. Input Validation**: Zod schemas on all mutations/queries; strict TS mode on server.
- **D3. CSRF/Headers**: enforce `SameSite=Lax`, CSRF token for cookie‑auth mode, `Content‑Security‑Policy` tightened.

### E) SLOs, Observability & Ops

- **E1. SLOs**: GraphQL p95 < 600ms, ANN p95 < 400ms, Socket round‑trip p95 < 150ms; error budget 99.5%.
- **E2. Alerts/Runbooks**: Prometheus alert rules + concise runbooks; synthetic checks (uptime, query probes).
- **E3. Backups/DR**: Neo4j/PG snapshot schedule; restore drills; RPO≤15m/RTO≤30m.

---

## 4) Concrete Tasks (Branches, AC)

| ID  | Task                                       | Branch                    | Acceptance Criteria                                                                                           |
| --- | ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | LWW/CRDT versioning & idempotent mutations | `realtime/versioned-ops`  | Concurrent updates settle deterministically; duplicate `x‑op‑id` is no‑op; conflict rate metric exported      |
| A2  | Presence & room hygiene                    | `realtime/presence-rooms` | Join/leave tracked; ghost sessions < 0.5%; max fan‑out respected; presence UI avatars visible                 |
| B1  | pgvector HNSW + backfill                   | `ai/ann-hnsw`             | `CREATE INDEX ... USING hnsw` exists; backfill complete; ANN query returns topK with scores; migration tested |
| B2  | `similarEntities` GraphQL + tests          | `ai/similar-entities-api` | Query by text or entityId works; latency p95 < 400ms @ 100k rows; unit + integration tests pass               |
| B3  | UI: Similarity Finder                      | `ui/similarity-finder`    | Right‑click node → "Find similar" → list with scores; add‑to‑graph bulk action                                |
| C1  | Neo4j indexes & query tuning               | `perf/neo4j-indexing`     | Hot queries p95 reduced ≥30%; PROFILE shows index usage; dashboards reflect drop                              |
| C2  | Redis cache for neighborhood               | `perf/neighborhood-cache` | Cache hit rate ≥70%; invalidation on entity/edge change verified; TTL and tag purge tested                    |
| C3  | Cytoscape LOD & sampling                   | `ui/lod-sampling`         | >50k elements interactive p95 frame time < 16ms; labels auto‑toggle; sampling toggle works                    |
| D1  | Rate limits + breaker                      | `security/rate-limit`     | Abuse tests blocked; 429 on exceed; breaker opens on sustained p95>2s and recovers                            |
| D2  | Zod validation all resolvers + TS strict   | `chore/zod-ts-strict`     | All inputs validated; `tsc --noEmit` clean under `strict: true`                                               |
| E1  | SLOs & alerts & runbooks                   | `ops/slos-alerts`         | Alert rules merged; runbooks in `/docs/runbooks/*.md`; synthetic checks green                                 |
| E2  | Backups/DR drill                           | `ops/backup-drill`        | Restore completed in staging within RTO; RPO validated; drill report attached                                 |

---

## 5) Code — Key Snippets

### 5.1 CRDT/LWW Versioned Mutations (server)

```ts
// server/src/middleware/versioning.ts
import { v4 as uuid } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export function assignOpId(req: Request, _res: Response, next: NextFunction) {
  (req as any).opId = req.headers['x-op-id'] || uuid();
  next();
}

export type VClock = { ts: number; origin: string };
export function compareClock(a: VClock, b: VClock): number {
  if (a.ts !== b.ts) return a.ts - b.ts; // later wins
  return a.origin.localeCompare(b.origin); // tie‑break deterministic
}
```

```ts
// server/src/services/GraphStore.ts (apply to nodes/edges)
async function upsertEntity(entity: EntityInput, opId: string, clock: VClock) {
  // idempotency: ignore if opId already applied
  const seen = await redis.sismember(`ops:${entity.id}`, opId);
  if (seen) return { status: 'noop' };

  const cypher = `
    MERGE (e:Entity {id:$id})
    ON CREATE SET e += $props, e.v_clock=$clock
    ON MATCH SET e = CASE
      WHEN e.v_clock.ts < $clock.ts OR (e.v_clock.ts = $clock.ts AND e.v_clock.origin < $clock.origin)
      THEN e + $props SET e.v_clock=$clock
      ELSE e
    END
    RETURN e`;
  await neo4jSession.run(cypher, { id: entity.id, props: entity.props, clock });
  await redis.sadd(`ops:${entity.id}`, opId); // mark applied
  await redis.expire(`ops:${entity.id}`, 86400);
}
```

### 5.2 Presence Service (Socket.IO)

```ts
// server/src/realtime/presence.ts
import { Server } from 'socket.io';
import Redis from 'ioredis';

export function wirePresence(io: Server, redis = new Redis()) {
  io.on('connection', (socket) => {
    socket.on('join-investigation', async ({ invId, user }) => {
      socket.join(`inv:${invId}`);
      await redis.hset(
        `presence:${invId}`,
        socket.id,
        JSON.stringify({ user, ts: Date.now() }),
      );
      io.to(`inv:${invId}`).emit(
        'presence:update',
        await redis.hlen(`presence:${invId}`),
      );
    });

    socket.on('disconnect', async () => {
      const keys = await redis.keys('presence:*');
      for (const k of keys) await redis.hdel(k, socket.id);
    });
  });
}
```

### 5.3 pgvector HNSW Migration & Query

```sql
-- server/scripts/sql/2025-08-15_hnsw_entity_embeddings.sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE entity_embeddings ALTER COLUMN embedding TYPE vector(1536);
CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_cos ON entity_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=200);
```

```ts
// server/src/graphql/resolvers/similarity.ts
import { pool } from '../../config/database.js';
import { z } from 'zod';

const Args = z.object({
  entityId: z.string().optional(),
  text: z.string().optional(),
  topK: z.number().int().min(1).max(100),
});

export const similarityResolvers = {
  Query: {
    similarEntities: async (_: any, args: any) => {
      const { entityId, text, topK } = Args.parse(args);
      let embedding: number[];
      if (entityId) {
        const { rows } = await pool.query(
          'SELECT embedding FROM entity_embeddings WHERE entity_id=$1',
          [entityId],
        );
        embedding = rows[0].embedding;
      } else {
        embedding = await computeEmbedding(text!);
      }
      const { rows } = await pool.query(
        'SELECT e.entity_id, 1 - (e.embedding <=> $1::vector) AS score\n         FROM entity_embeddings e\n         ORDER BY e.embedding <=> $1::vector ASC\n         LIMIT $2',
        [`[${embedding.join(',')}]`, topK],
      );
      // hydrate entities from Neo4j or PG cache
      return rows.map((r) => ({ id: r.entity_id, score: r.score }));
    },
  },
};
```

### 5.4 Neo4j Indexing & Query Hints

```cypher
// server/scripts/cypher/2025-08-15_indexes.cypher
CREATE INDEX entity_investigation_id IF NOT EXISTS FOR (e:Entity) ON (e.investigationId, e.id);
CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label);
// Neo4j 5+: relationship property index
CREATE INDEX rel_type_if_exists IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type);
```

### 5.5 Redis Cache for Neighborhood

```ts
// server/src/services/NeighborhoodService.ts
import Redis from 'ioredis';
const redis = new Redis();

export async function expandNeighborhoodCached(id: string, radius = 1) {
  const key = `neigh:${id}:${radius}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const data = await expandNeighborhoodFromNeo4j(id, radius);
  await redis.setex(key, 300, JSON.stringify(data));
  return data;
}

export async function invalidateNeighborhood(id: string) {
  const keys = await redis.keys(`neigh:${id}:*`);
  if (keys.length) await redis.del(keys);
}
```

### 5.6 Rate Limiting & Breaker

```ts
// server/src/middleware/rateLimit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis();
const limiter = new RateLimiterRedis({
  storeClient: redis,
  points: 300,
  duration: 60,
  keyPrefix: 'rlf',
});

export async function rateLimit(req, res, next) {
  try {
    await limiter.consume(req.user?.id || req.ip);
    return next();
  } catch {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
}
```

### 5.7 Cytoscape LOD UI

```jsx
// client/src/graph/lod.ts
export function applyLOD(cy) {
  const update = () => {
    const z = cy.zoom();
    const showLabels = z > 0.7;
    cy.batch(() => {
      cy.nodes().forEach((n) =>
        n.style('label', showLabels ? n.data('label') : ''),
      );
    });
  };
  cy.on('zoom', update);
  update();
}
```

---

## 6) Observability & SLOs

- **Metrics**: `realtime_conflicts_total`, `ops_idempotent_hits_total`, `presence_sessions_gauge`, `ann_query_ms`, `neighborhood_cache_hit_ratio`.
- **Dashboards**: Collaboration (presence, conflicts), ANN performance, Graph p95s; error budget burn‑down.
- **Alerts**: p95 GraphQL > 600ms (5m), ANN p95 > 400ms (5m), Socket RTT > 150ms (5m), conflict rate > 2% (15m).
- **Runbooks**: `/docs/runbooks/*.md` for each alert with step‑by‑step mitigations.

---

## 7) Risks & Mitigations

- **HNSW memory pressure** → tune `m`, `ef_construction`; cap vectors; monitor index size; tiered storage.
- **Realtime fan‑out spikes** → server‑side sampling, backpressure, per‑room caps; slow‑client eviction.
- **Cache staleness** → tag‑based invalidation hooks on entity/edge mutations; short TTLs.
- **Over‑validation latency** → compile Zod schemas once; avoid deep parsing in hot loops.

---

## 8) Next Steps (immediate)

1. Open branches per §4 as draft PRs with task lists.
2. Apply migrations (`pgvector` HNSW, Neo4j indexes) in staging; run backfill job.
3. Wire presence + versioned ops behind feature flag `REALTIME_V2=true` → staged rollout.
4. Stand up dashboards, alerts, and DR drill calendar invite; attach drill report to the release.

---

**End of Plan (v2)**
