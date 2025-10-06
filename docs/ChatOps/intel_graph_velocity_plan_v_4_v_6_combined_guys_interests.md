# IntelGraph Velocity Plan v4–v6 (Combined) — Guy’s Interests

**Owner:** Guy (IntelGraph Platform Engineer) **Repo:** `github.com/BrianCLong/summit` **Context:** v2 tie-offs complete; v3 in flight (AI explainability + similarity). This combined doc sets the next 3 sprints with ready-to-cut branches/PRs.

---

## Guy’s Interests (for context & decision tiebreakers)

- Multi-tenant **safety-first**: airtight isolation across API/Neo4j/Postgres/Redis; policy decisions auditable.
- **Performance under scale**: neighborhood caching, proper indexing/hints, client-side LOD for >50k elements, p95 budgets.
- **Simplicity & determinism**: LWW before CRDT, idempotent ops, schema-first contracts, predictable failure modes.
- **Security by default**: persisted queries, ABAC/OPA everywhere, least privilege on services/secrets, export redaction.
- **Observability**: OTel traces, Prom/RED dashboards, actionable SLOs, alert thresholds tied to user impact.
- **Developer ergonomics**: typed boundaries, clear PR scaffolds, CI gates (Golden Path), example snippets.

---

## Sprint 4 — Tenant Safety & Performance Hardening

### Executive summary

Lock airtight multi-tenant isolation across Neo4j/Postgres/Redis and make large investigations fast via neighborhood caching, Neo4j indexing, and Cytoscape LOD.

### Goals

- No cross-tenant data access (verified by OPA tests + integration tests).
- > 30% reduction in hot query latency.
- Smooth interaction on >50k elements via LOD and render throttling.

### Workstreams & deliverables

1. **Tenant isolation (end-to-end)**
   - Enforce `tenantId` in: GraphQL resolvers, Neo4j queries, Postgres selects/inserts (embeddings), Redis keys.
   - OPA policies expanded: `{ user.tenant == resource.tenant }` checks everywhere.
   - PQ per tenant (manifest namespace or prefix to prevent cross-tenant leakage).

2. **Neighborhood cache (Redis)**
   - Cache `expandNeighborhood(entityId, radius)` with tag-based invalidation on entity/edge changes.
   - Metrics: `neighborhood_cache_hit_ratio`, `neighborhood_cache_latency_ms`.

3. **Neo4j indexing pass**
   - Composite indexes: `(investigationId, id)`, `(label)`, relationship property index on `:RELATIONSHIP(type)`.
   - Cypher profiling & hints for top 5 hot operations.

4. **Cytoscape LOD**
   - Auto hide labels on zoom-out; defer expensive styles; throttle re-layout at high element counts.

### PR scaffolds (branches, titles, AC)

- `security/multi-tenant` — **feat(security): enforce tenant scoping across API/DB/cache**\
  **AC:** all resolvers require tenant; queries filtered; OPA tests pass; cross-tenant attempts 403; PQ manifests per tenant.
- `perf/neighborhood-cache` — **feat(perf): Redis neighborhood cache + invalidation**\
  **AC:** ≥70% cache hit on repeat ops; invalidation on mutations; latency histograms exported.
- `perf/neo4j-indexing` — **feat(perf): Neo4j indexes + query tuning**\
  **AC:** p95 latency for hot endpoints ↓≥30%; PROFILE shows index usage.
- `ui/cytoscape-lod` — **feat(ui): LOD for large graphs**\
  **AC:** >50k elements remain interactive (<16ms/frame target); labels toggle with zoom.

### PR description templates (paste into each draft PR)

**Template (use for all PRs; fill scope & tests)**

```
## Summary
<one-paragraph change summary>

## Scope
- [ ] Code
- [ ] Tests
- [ ] Docs
- [ ] Dashboards/Alerts (if applicable)

## Acceptance Criteria
- <bullet AC copied from plan>

## How to Test
1. <steps>

## Rollout / Risk
- Flags: <flags>
- Rollback: revert SHA, disable flag
- Risk: <areas>

## Metrics
- <list of new/affected metrics>
```

---

## Sprint 5 — Real-Time Collaboration & Presence

### Executive summary

Introduce CRDT/LWW updates with idempotent ops, presence rooms/avatars, and conflict telemetry; deliver a 2-user Golden Path collab E2E.

### Goals

- Deterministic conflict resolution (LWW) across nodes/edges.
- Idempotent mutations (duplicate op IDs are no-ops).
- Presence visible; ghost sessions < 0.5% in 24h runs.

### Workstreams & deliverables

1. **Versioned ops (CRDT/LWW)**
   - `(v_clock: {ts, origin})` on nodes/edges.
   - `x-op-id` idempotency keys tracked in Redis.
   - Server arbitration for concurrent writes.

2. **Presence & rooms**
   - Socket.IO rooms per investigation; presence hash in Redis.
   - Avatars + “editing…” status on selected nodes.

3. **Conflict telemetry & UX**
   - Counters: `realtime_conflicts_total`, `idempotent_hits_total`, socket RTT.
   - UI: conflict toast + “last update from {user} at {time}”.

### PR scaffolds

- `realtime/versioned-ops` — **feat(realtime): CRDT/LWW with idempotent ops**\
  **AC:** duplicate op ID → no-op; races settle LWW; metrics exported.
- `realtime/presence` — **feat(realtime): presence rooms + avatars**\
  **AC:** join/leave tracked; ghost sessions <0.5%; avatars shown.
- `ui/conflict-toasts` — **feat(ui): conflict/resolution notifications**\
  **AC:** colliding edits surface to user; audit trail logged.
- `test/e2e-collab` — **test(e2e): 2-user Golden Path collaboration**\
  **AC:** Playwright test passes with two parallel browser contexts.

### PR description templates

Use the same template; add **Load/Chaos** steps for websocket disruption and duplicate ops.

---

## Sprint 6 — Security, Compliance & Ops Excellence

### Executive summary

Enterprise hardening: fine-grained rate limits, circuit breakers, DLP/PII tagging & redaction on export, retention policies, and a DR drill with documented runbooks.

### Goals

- Sustained stability under abuse (rate limits + breaker).
- Clear data lifecycle & redaction for exports.
- Proven recovery: RPO ≤ 15m, RTO ≤ 30m.

### Workstreams & deliverables

1. **Rate limits & breaker**
   - Per-user, per-tenant, global buckets; ANN/RAG endpoints tightened.
   - Adaptive breaker on sustained p95>2s or 5xx spike.

2. **DLP & retention**
   - PII tags on entities; export pipeline redacts by role/sensitivity.
   - Retention policies (TTL) with archival hooks.

3. **Backups & DR**
   - Scheduled snapshots; restore rehearsal in staging with timer.
   - Runbooks for common incidents; on-call ready.

### PR scaffolds

- `security/rate-limit` — **feat(security): per-tenant/user rate limits + circuit breaker**\
  **AC:** abuse tests 429; breaker opens/closes; dashboards show buckets.
- `security/dlp` — **feat(security): PII tagging + export redaction**\
  **AC:** redaction depends on role; audit logs contain hashes not PII.
- `ops/retention` — **feat(ops): retention policies & archival**\
  **AC:** TTL enforced; opt-out per investigation supported; audit trail.
- `ops/backup-drill` — **chore(ops): DR drill with RPO/RTO validation**\
  **AC:** restore within targets; report checked in `/docs/runbooks`.

### PR description templates

Add a **Runbook** section for DR and **Security Review** checklist for DLP features.

---

## Cross-sprint dependencies & sequencing

- v4 tenant isolation must land before v5 collab to ensure presence/ops are tenant-safe.
- v4 performance (cache/indexes/LOD) reduces v5 collab latency.
- v6 DLP/retention aligns with export/reporting coming after v5.

## CI/CD & SLO updates (applies across v4–v6)

- Required checks: lint, typecheck, unit, **Golden Path**, new E2Es per sprint.
- SLOs: GraphQL p95 < 600ms; ANN p95 < 400ms; socket RTT < 150ms; error budget 99.5%.
- Dashboards: per-tenant breakdown; conflict rate; cache hit ratios; DR drill panel.

## Next steps (today)

1. Create branches listed in each sprint’s PR scaffolds as **draft PRs** with checklists.
2. Add new E2Es as required checks once merged to main.
3. Import/update Grafana dashboards for new metrics.
4. Schedule the DR drill (Sprint 6) on the team calendar.

---

# Separate Repo Docs (ready to add under `docs/`)

> Copy each section below into its own file:
>
> - `docs/velocity-plan-v4.md`
> - `docs/velocity-plan-v5.md`
> - `docs/velocity-plan-v6.md`

---

## `docs/velocity-plan-v4.md`

### IntelGraph — Velocity Plan v4: Tenant Safety & Performance Hardening

**Owner:** Guy — Theme: multi-tenant isolation + big graph performance

**Priorities**

1. Tenant isolation across API/Neo4j/Postgres/Redis + OPA tests
2. Neighborhood cache with invalidation
3. Neo4j indexing pass & query hints
4. Cytoscape LOD for large graphs

**PR scaffolds**

- `security/multi-tenant` — feat(security): enforce tenant scoping across API/DB/cache
- `perf/neighborhood-cache` — feat(perf): Redis neighborhood cache + invalidation
- `perf/neo4j-indexing` — feat(perf): Neo4j indexes + query tuning
- `ui/cytoscape-lod` — feat(ui): LOD for large graphs

**Acceptance criteria**

- No cross-tenant reads/writes; OPA/unit tests pass
- Neighborhood cache hit ≥70%; invalidation verified
- Hot endpoint p95 ↓≥30%; PROFILE shows index usage
- > 50k elements interactive (<16ms/frame), labels toggle

  **Observability**

- Metrics: `neighborhood_cache_hit_ratio`, `neo4j_query_ms`
- Alerts: cache hit <50% (warn), p95 query > target (warn)

**Next steps**

- Cut branches, open draft PRs, wire tests into CI

---

## `docs/velocity-plan-v5.md`

### IntelGraph — Velocity Plan v5: Real-Time Collaboration & Presence

**Owner:** Guy — Theme: multi-user editing with deterministic consistency

**Priorities**

1. CRDT/LWW versioned mutations + idempotency
2. Presence rooms + avatars
3. Conflict telemetry & UX toasts
4. Golden Path 2-user collab E2E

**PR scaffolds**

- `realtime/versioned-ops` — feat(realtime): CRDT/LWW with idempotent ops
- `realtime/presence` — feat(realtime): presence rooms + avatars
- `ui/conflict-toasts` — feat(ui): conflict/resolution toasts
- `test/e2e-collab` — test(e2e): 2-user collab path

**Acceptance criteria**

- Duplicate op ID → no-op; LWW resolves races
- Presence visible; ghost sessions <0.5%
- Conflict toast appears on collisions; audit trail
- Collab E2E passes in CI

**Observability**

- Metrics: `realtime_conflicts_total`, `idempotent_hits_total`, `socket_rtt_ms`
- Alerts: conflict rate >2% (15m), RTT >150ms (5m)

**Next steps**

- Cut branches, open draft PRs, integrate E2E into required checks

---

## `docs/velocity-plan-v6.md`

### IntelGraph — Velocity Plan v6: Security, Compliance & Ops Excellence

**Owner:** Guy — Theme: production hardening & recovery confidence

**Priorities**

1. Per-tenant/user rate limits + circuit breaker
2. DLP: PII tagging & export redaction
3. Retention policies & archival hooks
4. Backup + DR drill with runbooks

**PR scaffolds**

- `security/rate-limit` — feat(security): per-tenant/user limits + breaker
- `security/dlp` — feat(security): PII tagging + redaction
- `ops/retention` — feat(ops): retention policies & archival
- `ops/backup-drill` — chore(ops): DR drill & runbooks

**Acceptance criteria**

- Abuse tests return 429; breaker opens/closes correctly
- Exports respect redaction by role/sensitivity; PII not logged
- TTLs enforced; audit trail for deletions/archival
- DR restore: RPO ≤ 15m, RTO ≤ 30m; report committed

**Observability**

- Metrics: `rate_limit_exceeded_total`, `breaker_state`, backup timings
- Alerts: breaker open >5m (page), snapshot failure (page)

**Next steps**

- Cut branches, draft PRs, schedule DR drill & publish runbooks
