# Council Wishbook Prompts #9–#16

These prompts extend the wishbook backlog with eight parallelizable missions. Each is scoped to stay behind its feature flag and integrate only through typed APIs or events.

## Prompt #9 — Entity Resolution & Identity Service (ERIS)
- **Mission:** Ship a standalone ER microservice that scores, clusters, and adjudicates merges with explainability and reversibility.
- **Deliverables:** `/services/eris` (Python 3.12 + FastAPI) with MinHash/LSH blocking, pairwise classifier, clusterer; `/er/explain` exposes feature vectors/rationale. Human-in-the-loop UI with candidate queue, side-by-side diff, reversible merge/split, override reason capture. APIs `/er/candidates`, `/er/merge`, `/er/split`, `/er/explain`; Kafka events `er.candidate`, `er.merged`, `er.split`. Golden datasets plus reproducible scoring harness.
- **Constraints:** No biometric identification; perceptual hashes only for dedupe. Policy labels on merges; confidence decays over time.
- **DoD/CI:** Reproducible merges on gold sets; overrides log user + reason; latency SLOs documented; feature flag `ER_ENABLED`.
- **Tuning:** Start with email, phone, alias, and geo co-occurrence as feature sources. Recommend three-band adjudication: ≥0.9 auto-merge, 0.7–0.89 manual review, <0.7 reject/queue for enrichment.

## Prompt #10 — Temporal Engine (Bitemporal Truth + Time-Travel Queries)
- **Mission:** Implement bitemporal storage and APIs for snapshot-at-time semantics with cadence/gap highlighting.
- **Deliverables:** Neo4j/Cypher patterns and GraphQL wrappers for `validFrom/validTo` and `observedAt/recordedAt`; `GET /time/snapshot?at=…` materializer; timeline gap detector + UI hooks; costed time-slice plans with persisted queries.
- **Constraints:** Read-only initially; no historical mutation rewriting. Redaction-aware results.
- **DoD/CI:** Time-travel query returns consistent neighborhood snapshots on fixtures; timeline view highlights gaps; Playwright test covers visual gaps; feature flag `TEMPORAL_ENABLED`.
- **Tuning:** Default “as-of” precision at second-level; guarantee at least 18 months of snapshot retention unless overridden by data governance.

## Prompt #11 — Graph Analytics Kernel (Link, Community, Centrality)
- **Mission:** Provide deterministic analytics (shortest paths, Louvain/Leiden, betweenness/eigenvector) with reproducibility and tolerance bands.
- **Deliverables:** `/analytics/kernel` (Node/TS + worker pool) with K-shortest paths, policy-aware routes, Louvain/Leiden, betweenness/eigenvector using snapshot pins; result schema + caching; per-algorithm explainers; reproducibility seed handling; conformance suite reproducing published examples within tolerance.
- **Constraints:** No PII in metrics storage; cache invalidation on policy or snapshot change.
- **DoD/CI:** Benchmark metrics reproducible; docs list tolerance thresholds; p95 < 1.5s for typical N=50k neighborhoods; feature flag `ANALYTICS_KERNEL`.
- **Tuning:** Prioritize Leiden first for better community stability; allow ±3% tolerance for centrality metrics in tests.

## Prompt #12 — Evidence-First GraphRAG (with Path Rationales)
- **Mission:** Build retrieval over case subgraphs returning answers only with path-based rationales and citation pointers; missing citations block publish.
- **Deliverables:** `/ai/graphrag` service with subgraph indexer (paths + node/edge facets) and retriever returning answers, paths, exhibits. UI “Why?” panel with inline citations and path visualization; redaction-aware snippets. Publication gate rejects outputs lacking resolvable citations.
- **Constraints:** Always return paths + exhibit IDs; no free-text without provenance.
- **DoD/CI:** Citations always resolve to evidence; redact-aware snippets; publication blocked on missing proof; snapshot tests for path rationales; feature flag `GRAPHRAG_ENABLED`.
- **Tuning:** Cap explanation path length at 5 hops to stay reviewable; include counter-evidence suggestions in v1 to aid analyst validation.

## Prompt #13 — Case Spaces & Brief/Report Studio
- **Mission:** Ship collaborative case rooms (tasks/roles/watchlists, 4-eyes) and a report studio exporting redaction-safe PDF/HTML bundles.
- **Deliverables:** `/apps/web/case-spaces` with tasks, roles, SLA timers, legal hold, immutable comments, @mentions. `/apps/web/brief-studio` with figure composer (graph/timeline/map), caption assistant, one-click PDF/HTML export with redaction maps. Manifest verifier hook on export.
- **Constraints:** Full audit trail; dual-control for risky steps; cross-tenant deconfliction via hashed IDs.
- **DoD/CI:** All edits/audits visible; export validated via manifest verifier; Playwright E2E “draft → redacted PDF → verify”; feature flags `CASE_SPACES`, `BRIEF_STUDIO`.
- **Tuning:** Provide three starter templates (court, partner briefing, internal update). Default SLA timers: 24h for triage, 72h for investigations, 7d for strategic reports.

## Prompt #14 — Edge/Offline Expedition Kit (CRDT Sync + Signed Logs)
- **Mission:** Deliver offline tri-pane workspace with CRDT-based annotations, signed sync logs, and divergence reports on reconnect.
- **Deliverables:** Desktop kit with local vaults, CRDT for docs (RGA/WOOT) and LWW-element-set for annotations. Sync service supporting windowed sync, operator approval, conflict UI; signed resync logs; USB escrow packaging flows.
- **Constraints:** Per-case crypto; tamper-evident local logs; delayed visibility options.
- **DoD/CI:** CRDT merges verified; divergence report E2E; air-gapped update train smoke tests; feature flag `OFFLINE_KIT`.
- **Tuning:** Minimum viable CRDT set should cover notes + tags alongside annotations. Require explicit operator approval for the first sync per case.

## Prompt #15 — API Surface & Contracts (Gateway + Events + Webhooks)
- **Mission:** Establish authoritative GraphQL gateway with persisted queries, cost limits, field-level authz, signed webhooks, and SDKs.
- **Deliverables:** GraphQL gateway with persisted queries, cost planner, field-level ABAC hooks. Eventing topics + outbox pattern; signed webhooks (HMAC) with retries + DLQs. SDKs (TS/Java/Python) with conformance tests and “hello world” examples.
- **Constraints:** Rate/cost controls per tenant; query planners return cost estimates; no secret leakage in webhook payloads.
- **DoD/CI:** Contract test suite across SDKs; backpressure hints verified; cost limit enforcement tests; feature flag `API_GW`.
- **Tuning:** Seed persisted queries for core reads (case summary, entity detail, timeline slice). Prefer `X-Webhook-Signature` carrying algo, key ID, and HMAC.

## Prompt #16 — Data Quality & Stewardship Dashboards
- **Mission:** Stand up DQ metrics and stewardship workflows for completeness, consistency, timeliness, duplication, and provenance coverage per connector and case.
- **Deliverables:** `/ops/dq` jobs computing DQ scores; dashboards for per-connector health, ER quality, contradiction density. Steward roles and approval flows with change logs and alert thresholds.
- **Constraints:** No raw PII in metrics; link license + provenance coverage to remediation.
- **DoD/CI:** Dashboards live with drill-downs; stewards can approve/rollback changes; acceptance pack for DQ metrics; feature flag `DQ_DASHBOARDS`.
- **Tuning:** Treat completeness, timeliness, and provenance coverage as gating; contradiction density and duplication as informative. Steward approvals owned per connector with tenant-level override when flagged by compliance.

## Parallelization Map
- #9 (ERIS) emits events only; no shared DB → safe alongside #11 (kernel).
- #10 (Temporal) is read-path; #11 (kernel) consumes snapshots; interfaces stable.
- #12 (GraphRAG) reads from snapshots and provenance; publish blocked if citations missing—no write conflicts.
- #13 (Case/Brief) consumes manifests from earlier provenance ledger; exports validated—decoupled from #12 internals.
- #14 (Offline) is edge-scoped with CRDT state; sync service isolated via signed logs.
- #15 (API GW) front-doors everything with persisted queries; won’t break feature-flagged services.
- #16 (DQ) reads; only writes DQ indices and steward logs.

## Meta Prompt (Reused Verbatim for Teams)
“Build to the acceptance criteria above, gate behind the specified feature flag, keep services and DBs isolated, depend on other teams only via events or typed APIs, and ship with unit + contract + E2E tests and golden fixtures. Prefer append-only logs, explicit manifests, and verifiable proofs. Target p95 ≤ 1.5s for standard graph queries and never log PII. Every PR spins a preview environment, runs k6 smoke, Playwright E2E, and contract tests. Canary + auto-rollback required.”

## 23rd-Order Extrapolated Implications (Maximally Ideal)

The chains below capture the “maximal ideal” interpretation: each implication describes the expected emergent property, the signals that prove it, and the guardrails that keep it resilient under churn and policy change.

1. **Zero-regret merge lineage (ERIS):** All merges remain replayable with signed rationale chains, enabling post-incident reconstruction and legal defensibility without reprocessing raw PII.
   - **Signals:** Deterministic merge DAGs with hash-stamped feature vectors; override log completeness ≥99.9% on gold runs.
   - **Guardrails:** Append-only rationale ledger with immutability proofs; automated diff replays on every policy bump.
2. **Autonomous risk throttling (ERIS):** Confidence decay auto-tunes candidate surfacing frequency so that stale identities gradually downgrade to manual review, preventing silent drift.
   - **Signals:** Decay curves parameterized per policy label; alerting on overdue re-evaluations; review queue aging <24h at p95.
   - **Guardrails:** Per-tenant decay ceilings; force-review switch if decay exceeds configured policy envelope.
3. **Policy-coherent cluster memory (ERIS + DQ):** Merge/split actions emit immutable policy labels that propagate to DQ dashboards, letting stewards trace ER quality regressions to specific overrides.
   - **Signals:** DQ panels show ER quality trendlines keyed by policy version; causal drill-downs from regression to override actor.
   - **Guardrails:** Schema evolution tests for event payloads; backfills run in canary before dashboard adoption.
4. **Temporal diff provenance (Temporal Engine):** Time-travel snapshots include machine-verifiable diff manifests so analysts can certify what changed between two instants without querying the full graph.
   - **Signals:** Diff manifests reference snapshot digests; time-to-diff <400ms for N=10k node neighborhoods.
   - **Guardrails:** Redaction-aware diffing; replayable materialization scripts stored with fixtures.
5. **Snapshot-aware analytics (Kernel + Temporal):** Every analytics run pins to a snapshot digest, ensuring reproducible leaderboards even as live data shifts, and allowing cache reuse only when the digest matches.
   - **Signals:** Result payloads echo snapshot hash + seed; cache hit logs carry digest equality proof.
   - **Guardrails:** Cache eviction on policy or digest mismatch; CI conformance replays across digests.
6. **Costed query markets (Temporal + API GW):** Persisted queries publish estimated temporal slice costs that downstream SDKs surface, letting tenants budget execution before issuing calls.
   - **Signals:** Gateway responds with `costEstimate` envelopes; SDK UI surfaces “pre-flight” costs; opt-in cost ceilings.
   - **Guardrails:** Cost overruns routed to DLQ; budget policy enforcer blocks queries lacking estimates.
7. **Edge-verifiable evidence (GraphRAG + Offline Kit):** Offline kits bundle signed path rationales so answers gathered in the field can be revalidated against central provenance once reconnected.
   - **Signals:** Reconnect reconciles offline signatures with central manifests; variance reports show zero missing paths.
   - **Guardrails:** Air-gap-safe signature validation; auto-reject if provenance hashes fail to align with ledger.
8. **Four-eyes everywhere (Case Spaces + API GW):** Dual-control approvals flow through field-level ABAC rules, ensuring that risky exports or merges require policy-backed co-signature no matter the channel.
   - **Signals:** Approval events reference ABAC rule IDs; audit trails record both signers and policy rationale.
   - **Guardrails:** Time-bound approval validity; fallback break-glass with mandatory incident record.
9. **Universal manifest bridge (Brief Studio + Prov Ledger):** Every export carries a manifest hash referenced by GraphRAG paths, enabling “click-to-evidence” from rendered PDFs back to the originating exhibits.
   - **Signals:** PDF/HTML exports include manifest checksum; GraphRAG UI resolves clickbacks to exact exhibit IDs.
   - **Guardrails:** Manifest verifier blocks exports on mismatch; CI snapshot tests for clickback integrity.
10. **Gap-to-risk linkage (Temporal + DQ):** Timeline gap detectors emit `dq.gap` alerts so stewards can correlate missing spans with drops in completeness, closing data drift before analytics degrade.
    - **Signals:** `dq.gap` carries affected entity IDs + expected cadence; DQ dashboards annotate risk periods.
    - **Guardrails:** Playwright checks for gap highlighting; alert suppression rules require steward acknowledgement.
11. **Cache invalidation proofs (Analytics Kernel):** Cache entries store the policy snapshot and ABAC version; when policies rotate, invalidation proofs are logged to demonstrate least-privilege continuity.
    - **Signals:** Cache hits show snapshot+ABAC tuple; invalidation logs emit signed proofs linked to policy commit hash.
    - **Guardrails:** Cache warming requires policy parity; SLO alarms if stale cache served post-policy-change.
12. **Signed webhook attestations (API Surface):** Each webhook includes a detached signature plus key-ID rotation schedule, letting receivers enforce replay protection and tenant-specific audit retention.
    - **Signals:** Webhook headers expose `X-Webhook-Signature` with algo + key ID; receivers log replay counter.
    - **Guardrails:** Rotation SLAs encoded in contract tests; DLQ quarantines unverifiable payloads.
13. **Event-only coupling (ERIS + Kernel):** ERIS emits enriched entity linkage hints that the analytics kernel can ingest as optional priors without requiring DB coupling, preserving isolation guarantees.
    - **Signals:** `er.candidate` carries linkage hints flagged as advisory; kernel logs show priors applied/not-applied for reproducibility.
    - **Guardrails:** Priors gated behind feature flag; analytics results must remain deterministic absent hints.
14. **Redaction-first authoring (Brief Studio):** Templates auto-apply redaction maps before export so no draft can be rendered without explicit steward acknowledgement of masked sections.
    - **Signals:** Draft renders watermark redaction status; export pipeline fails closed if any section lacks mask state.
    - **Guardrails:** Redaction policy tests in CI; manual overrides require dual-control and reason capture.
15. **CRDT audit invariants (Offline Kit):** Divergence reports include per-field CRDT clocks and signature trails, enabling auditors to confirm that no local edits bypassed operator approvals.
    - **Signals:** Reconciliation logs list vector clocks and signer IDs; variance delta exported as signed bundle.
    - **Guardrails:** Operator approval enforced on first sync; conflicting edits sandboxed until steward release.
16. **Backpressure as contract (API GW + SDKs):** SDKs surface backpressure hints as first-class typed errors, making rate/cost feedback testable in contract suites and preventing abusive retry storms.
    - **Signals:** Typed `BackpressureHint` emitted with retry-after and cost guidance; SDKs expose exponential backoff defaults.
    - **Guardrails:** Contract tests assert propagation; breaker trips if hints absent beyond threshold.
17. **Policy-sharded metrics (Analytics + DQ):** Centrality and community metrics are tagged with policy shards so dashboards can partition scores by policy regime, enabling safe multi-tenant benchmarking.
    - **Signals:** Metrics include `policyShardId`; dashboards allow shard toggles; export APIs redact shardless data.
    - **Guardrails:** Shard ID schema validated in CI; metrics cache segregated per shard.
18. **Counter-evidence loops (GraphRAG):** Every answer requires at least one counter-path; reviewers can promote counter-evidence to block publication, yielding a baked-in adversarial review circuit.
    - **Signals:** Responses carry `paths.supporting` and `paths.counter`; publication gate blocks missing counter-paths.
    - **Guardrails:** Snapshot tests include adversarial fixtures; override requires steward reason + issue link.
19. **Immutable override registry (Case Spaces + ERIS):** Manual overrides are anchored to a registry with reason codes and user signatures; DQ stewards can bulk-revoke overrides if a policy is deprecated.
    - **Signals:** Registry emits append-only entries with hash chain; revocation job logs affected merges/splits.
    - **Guardrails:** Registry compaction forbidden; bulk revoke runs in dry-run mode before commit.
20. **Edge escrow recoverability (Offline Kit):** USB escrow packages contain encrypted manifests and integrity beacons so central ops can validate completeness without reading contents, meeting air-gap rules.
    - **Signals:** Beacons verified on ingest; completeness score computed without decrypting payloads.
    - **Guardrails:** Escrow rotation schedule; tamper alerts on beacon mismatch trigger operator review.
21. **Latency guardrails (All services):** Each feature flag activates with SLO budgets; if p95 exceeds thresholds, canary rollback triggers automatically and emits `slo.violation` events for observability.
    - **Signals:** Canary metrics tagged by flag; auto-rollback leaves signed audit trail with before/after SLOs.
    - **Guardrails:** Rollback blocks re-enable until variance resolved; k6 smoke embedded in rollback validation.
22. **Cross-tenant deconfliction proofs (Case Spaces):** Hashed IDs are salted per tenant and attested by the gateway, enabling cryptographic guarantees that watchlists cannot collide across tenants.
    - **Signals:** Gateway attestation includes salt ID; collision checks logged and exposed via admin dashboard.
    - **Guardrails:** Salt rotation policy with overlap window; proofs archived for compliance audits.
23. **Federated acceptance packs (DQ + API GW):** Acceptance artifacts (fixtures, manifests, tolerance bands) are published per feature flag; the gateway refuses enablement until the corresponding pack is signed and uploaded.
    - **Signals:** Enablement API checks signature + hash; dashboards display pack provenance and expiry.
    - **Guardrails:** Staged rollout enforces pack presence; CI fails if pack manifest is missing or unsigned.
