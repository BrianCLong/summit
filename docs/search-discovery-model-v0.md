# Search & Discovery Model v0

## Domain model

- **Indexable entities**: tenants, users, services, incidents, policies, docs, runbooks, events, configs. Additional derived objects include alerts, dashboards, and tasks when linked to core entities.
- **Core fields** (shared schema envelope):
  - `id` (global, stable), `type` (enum), `name`/`title`, `description`/`summary`
  - `owner` (user/team), `tenant`, `domain` (ops, security, infra, compliance, finance)
  - `status` (open/closed/live/draft), `severity`/`priority`, `state` (lifecycle), `risk_level`
  - `time` facets: `created_at`, `updated_at`, `occurred_at`, `resolved_at`, TTL/expiry
  - `tags` (normalized, hierarchical), `labels` (free-form), `geo/region`, `env` (prod/stage/dev)
  - `links` (source URL, runbook, dashboards), `relations` (parent/child/peer), `provenance` (ingestor, version, checksum)
  - `permissions`: ACL/ABAC grants (principal, action, scope), row-level policies, redaction rules
- **Facets**: type, tenant, owner, team, severity, status, lifecycle state, environment, region, tag, policy domain, compliance framework, data sensitivity, temporal windows (last 15m/1h/24h/7d), confidence/relevance buckets.
- **Security model**
  - **Visibility** derived from source-of-truth authz: RBAC/ABAC checks during indexing and at query time. Index stores per-document ACL bitsets + attribute filters to short-circuit unauthorized results.
  - **Tenant isolation**: hard filter by tenant IDs; cross-tenant search only via explicit elevated roles with audited scopes.
  - **Row/field redaction**: store redaction views; snippets computed post-filter with masked fields. Pseudonymize PII at ingest (hash + salt) with reversible escrow service when allowed.
  - **Provenance + audit**: every result includes `why-visible` payload (policy, grant, decision trace, timestamp) for transparency.

## Search experiences

- **Global search (spotlight)**: command palette (⌘K/CTRL+K) with type-ahead; shows top intents (navigate, run action, open doc). Results blended across entities with chips for type, tenant, environment, recency, confidence, and access reason. Supports keyboard-first navigation and quick actions (open, copy link, create incident, message owner).
- **Scoped search**: module-aware (e.g., within Incidents, Policies, Services). Defaults to the module entity type and pre-applies contextual filters (tenant, environment, severity). Allows switching scope inline and pivoting to global.
- **Filtering & facets**: left-rail or inline chips. Multi-select facets, date histogram brushing, saved filter sets, and organization-wide “pinned” views curated by admins.
- **Saved searches & pins**: users save queries + facets + sort; can promote to shared views with RBAC. Pinned views appear in navigation and support subscriptions (email/webhook/Slack) for delta updates.
- **Relevance cues**: badges for `Recent` (within SLA window), `Trending` (velocity), `High confidence` (matched exact fields + entity popularity + source trust), and `Access reason`.
- **Ranking signals**: textual match (BM25/semantic), structured boosts (severity, freshness, owner/team affinity), behavior (clickthrough, dwell), graph-based proximity (service ↔ incidents ↔ runbooks), and trust signals (source quality, verification). Diversify results to avoid over-representation of one type.

## Indexing & performance

- **Data sources**: service catalog, incident mgmt, policy store, doc/rubnbok repos, config mgmt DB, event streams, audit logs, ticketing, and chat/decision logs where permitted.
- **Ingestion**: hybrid pipeline: change-data-capture + webhooks for low-latency updates (<1m target); scheduled backfills for slow sources (hourly/daily); bulk bootstraps for new tenants. Normalize tags and identities via central directory.
- **Update handling**: version documents; soft-delete tombstones with TTL; propagate redactions immediately (PII delete/RTBF). Maintain `last_seen` heartbeat; purge stale entries beyond SLA.
- **Privacy constraints**: field-level classification; redact or hash sensitive fields at ingest; maintain consent flags and retention policies per tenant. Keep audit trail of indexing actions.
- **Query performance**:
  - Pre-filter by tenant/access bitmap; cache query plans and hot facet counts per scope.
  - Use tiered storage: hot index for last 30 days; warm for older, with federated query fallback.
  - Semantic expansion (synonyms/embeddings) constrained by type; degrade gracefully to lexical if embedding service unavailable.
  - Response SLA: p95 < 250ms for hot tier. Cache results by (query, facets, principal, tenant) with short TTL; invalidate on updates.

## Artifacts

### “Search & Discovery Model v0” outline

1. Purpose & scope
2. Entity schema envelope (core fields, required vs optional)
3. Type-specific extensions (incident, service, policy, doc, runbook, event, config)
4. Security model (tenant isolation, RBAC/ABAC, redaction, provenance)
5. Ranking & relevance model (signals, weights, learning-to-rank hooks)
6. Indexing pipeline (sources, normalization, dedupe, classification, versioning)
7. Query execution (lexical + semantic, pre-filters, snippets, fallbacks)
8. Observability (dashboards, alerts, audit trail, A/B for ranking)
9. SLOs & runbooks (ingest latency, query latency, error budgets)
10. Governance (data retention, privacy, access approvals)

### Example search flows

- **Ops persona**
  1. Hits ⌘K, types “checkout latency” → top results: active incident INC-123 (Recent, High severity), related service `checkout-api`, pinned runbook.
  2. Applies facet `env:prod`, `severity>=high`; saves as “Checkout hot issues” and pins to Ops nav.
  3. Opens incident; quick action to page on-call and open dashboard link; access reason shows “Allowed via role: incident-responder@tenantA”.
- **Security persona**
  1. In Security module scoped search, query “unused admin tokens” → filters default to `domain:security`, `status:open`, last 30d.
  2. Expands to global to include docs/runbooks; sees policy `POL-045` and recent event stream anomalies with confidence scores.
  3. Saves search with notification subscription (daily digest) and shares with Security Lead role.
- **Exec persona**
  1. Uses global search for “Q3 reliability” → sees curated dashboard, recent incidents summary, SLA compliance report.
  2. Applies facet `tenant:all` (allowed by elevated role) and `time:quarter`. Pins view to homepage; exports to PDF.
  3. Confidence badges explain why items ranked (freshness, popularity, ownership).

### “Search-ready” checklist

- Entity has global `id`, `type`, tenant tag, owner/team, status/state, severity/priority, timestamps.
- Normalized tags/labels applied; environment/region provided.
- Source of truth for ACL/RBAC mapped; tenant isolation verified; redaction policy defined for sensitive fields.
- Links to runbooks/docs/dashboards present; relations to upstream/downstream entities recorded.
- Ingestion configured with SLA (latency, retention) and test coverage for schema validation.
- Observability: index freshness metrics, query latency, error rates, and audit logs enabled.
- Relevance hints supplied (importance, lifecycle stage, popularity counters) and synonyms curated.
- Deletion/RTBF paths verified; tombstones honored; versioning enabled.
