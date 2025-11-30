# Prompt Batch #33–#40 Tuning Decisions (Expanded)

These decisions fully bind the tranche of feature-flagged tracks (#33–#40), pushing each surface to the “23rd order of extrapolated implication” by spelling out defaults, guardrails, telemetry, and rollout playbooks. All items are scoped to merge cleanly behind their respective flags and satisfy the CI and SLO gates stated in the prompts.

## Prompt #33 — Identity Federation & Access Plane (ACCESS_PLANE_ENABLED)
- **Initial IdPs to certify:** Okta and Microsoft Entra ID first (covering SAML + OIDC enterprise baselines), followed by Authentik to validate self-hosted parity and SCIM interoperability.
- **Default role packs (RBAC → ABAC bridge):** Analyst, Steward, Ombuds, and Admin. Admin changes require dual-control plus break-glass logging; Steward carries data-quality ABAC attributes by default; Ombuds inherits privacy-scope attributes for limited-case audits.
- **Policy claim minting:** issue JWT/DPoP tokens embedding both role grants and signed ABAC attribute bundles, with LAC hooks to inject per-query attribute filters at GraphQL middleware time.
- **WebAuthn step-up:** register and enforce platform authenticators for high-risk scopes (role changes, key rotation, SCIM schema edits); emit `auth.stepup.required|passed` events with hashed principal IDs only.
- **SCIM safety rails:** reject writes carrying PII in custom attributes; hash external identifiers before logging `idp.user.synced`; enforce least-privilege SCIM tokens and schema validation per provider profile.
- **Key rotation:** rotate signing keys via KMS (#27) every 30 days with overlapping verification windows and per-tenant kid pinning.
- **Admin UI guardrails:** preview RBAC→ABAC impact before apply; reason strings surfaced for GraphQL field-level denials; apply optimistic concurrency to role templates and policy drafts.

## Prompt #34 — Universal Search (SEARCH_ENABLED)
- **Default facets:** type, source, time, confidence, license; expose redactable facets per tenant config and hide blocked fields from snippets by default.
- **Score weighting:** lexical 0.5, vector 0.3, path 0.2 as launch defaults with feature-flagged overrides for A/B harness. Path weight auto-boosts when a result is ≤2 hops from an active case node.
- **Result explainer:** include token matches, nearest-neighbor IDs (masked), path hint summaries, and provenance citations; never emit raw vectors.
- **Index hygiene:** schema-versioned indices with background migrations; redaction-aware snippet generation that elides suppressed fields and honors license scopes.

## Prompt #35 — Geospatial Analytics Engine (GEO_ENABLED)
- **Default H3 resolution:** zoom 0–5 → res 4, 6–9 → res 6, 10–13 → res 8, 14+ → res 9. Snap to S2 equivalents for cross-lib parity; clamp to res 7 for logs to avoid coordinate leakage.
- **Geofence alert throttle:** minimum 30 seconds between identical enter/exit events per entity; coalesce churn into a single `geo.geofence.enter|exit` with count metadata.
- **Privacy and perf:** apply spatial fuzzing ≥1km at zoom ≤6; cap tiles to p95 ≤200ms with prebaked heatmap tiles for the previous 24h window.
- **Map-timeline sync:** lasso selections publish only bin IDs (no raw coords) and carry license tags into timeline brushes.

## Prompt #36 — OLAP Mirror & BI Connector (OLAP_MIRROR_ENABLED)
- **Preferred OLAP sinks:** certify ClickHouse first for latency + columnar joins; DuckDB second for embedded/offline; Parquet in object storage remains the canonical append-only mirror with schema markers.
- **Snapshot cadence:** hourly micro-batches with streaming append for hot consumers; backfill via snapshot markers that guarantee idempotent replay.
- **Data handling:** pseudonymize IDs at ingest; bake license filters into CDC extraction; expose Trino/Arrow with row-level filters derived from LAC policies.
- **Quality gates:** consistency checks vs. graph snapshot on every batch; drift alerts on schema hash mismatches; k6 baselines for ClickHouse query shapes.

## Prompt #37 — Usage Metering, Quotas & Chargeback (METERING_ENABLED)
- **Default quotas by plan:**
  - Starter: 50k API calls/month, 100 GB storage, 500 compute minutes, 50 GPU minutes.
  - Growth: 250k API calls/month, 500 GB storage, 5k compute minutes, 500 GPU minutes.
  - Enterprise: negotiated baselines; hard caps disabled but enforced budget alerts and tamper-evident meters.
- **Alert channels:** email and webhook at launch; PagerDuty as the first on-call integration with per-tenant routing keys.
- **Evaluation semantics:** sliding 28-day windows for burst tolerance; quota evaluator runs pre-admit for hard caps and emits `policy_denied` events tagged with budget IDs.
- **Telemetry:** privacy-preserving counters (no payloads), signed rollups, and Cost Guard integration via side-channel events.

## Prompt #38 — Scenario Trainer & Guided Onboarding (COACH_MODE_ENABLED)
- **First scenarios:** incident triage basics, data provenance verification, and access review remediation, each seeded from synthetic datasets (#21) with replayable seeds.
- **Passing thresholds and caps:** 80% score minimum, 20-minute cap per scenario, retries allowed with fresh seeds; ghost-cursor “Show me how” available after the first failed attempt.
- **Coach fidelity:** hints reveal progressively (three-step ladder), and rubric scoring emits per-criterion feedback stored in opt-in progress persistence.
- **Safety:** scenarios labeled SYNTHETIC in UI and telemetry; no crossover with real cases; accessibility checks (WCAG AA) on hints panel and controls.

## Prompt #39 — GNN Lab (GNN_LAB_ENABLED)
- **Target tasks first:** link prediction (cold-start suggestions) followed by node classification (enrichment) to maximize early value and reuse vector store (#29).
- **Explanation fidelity:** require ≥0.85 relative fidelity (ROAR/IG-styled) before emitting suggestions; attach influential paths/features in the “why” panel and audit cards.
- **Reproducibility:** snapshot-pinned datasets, deterministic seeds, and model registry entries with checksum + license lineage; exports flow only to ERIS queue (#9) with LAC-aware feature filters.

## Prompt #40 — Extension Marketplace & WASM Sandbox (EXTENSIONS_ENABLED)
- **Initial capability set:** read-only graph views, DOM render targets for widgets, bounded local cache (quotaed), explicit outbound network opt-in, and scoped filesystem/case access caps.
- **Publishing flow:** automated static checks + signed manifest validation gate; manual review before listing and capability grants; provenance badges generated from signer keys.
- **Sandbox guardrails:** no network by default; CPU/memory caps per module; audit `ext.published|approved|revoked` with hashed developer IDs and deny execution on capability mismatches.
