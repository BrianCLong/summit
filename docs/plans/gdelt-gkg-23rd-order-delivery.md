# GDELT GKG 23rd-Order Delivery Plan (Governed Integration)

## Evidence-First Preamble (UEF)
- Authority baselines: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`.
- Governance constraints: `agent-contract.json`, `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`.
- Program intent source: `docs/roadmap/STATUS.json` (updated in same change).
- Operational mandate: **Never defend the past. Only assert the present and dictate the future.**

## High-Level Summary & 23rd-Order Imputed Intention
**Present assertion:** GDELT GKG is integrated as a governed, external narrative signal plane with deterministic evidence bundles, scoped inference firewalls, and replayable ingestion. **Future directive:** all narrative observations remain segregated from curated facts unless promoted through policy-as-code with signed decision records.

**Imputed intention (1st–23rd order, compressed):**
1. Obtain real-time global narrative signals for Summit investigations.
2. Enforce deterministic ingestion and replayability.
3. Preserve evidence-grade provenance with immutable bundles.
4. Ensure scope isolation to prevent cross-case leakage.
5. Prevent inference drift by default.
6. Enable bounded-cost analytics via partition-pruned BigQuery.
7. Provide audit-ready claim lifetimes and decay.
8. Maintain policy-as-code enforcement for regulatory logic.
9. Guarantee reversibility for autonomous decisions.
10. Provide a promotion workflow that is human-approvable and signed.
11. Introduce bias/noise controls via stratification and dedup.
12. Maintain latency bounds compatible with 15-minute cadence.
13. Ensure observability hooks for anomaly detection.
14. Preserve graph determinism (ORDER BY + LIMIT).
15. Align with MAESTRO threat model across layers.
16. Provide measurable gates (tests + evidence bundles).
17. Maintain boundaries between server/web/connector zones.
18. Avoid secrets and default credentials.
19. Enable deterministic, idempotent upserts for graph storage.
20. Provide a clear rollback path for each deployment stage.
21. Enforce policy versioning in `packages/decision-policy/` for any regulatory logic.
22. Encode “observations ≠ facts” as an invariant in policy + tests.
23. Deliver a PR-ready stack with explicit labels, metadata, and evidence artifacts.

## Full Architecture (Two-Plane Epistemic Model)
### Plane A: Fact Plane (Curated, Governed)
- Canonical entities, relationships, and claims.
- Promotion pipeline required for any signal-derived assertion.

### Plane B: Signal Plane (External Observations)
- GDELT GKG records ingested as observations only.
- Scoped TTL for derived narrative claims; default to decay.

### Key Components
- **Connector:** `connectors/gdelt_gkg/` (raw files + BigQuery modes).
- **Evidence Bundles:** `packages/evidence/` (`report.json`, `metrics.json`, `stamp.json`).
- **Policy Firewall:** `packages/graphrag/policy/QueryPolicy.ts` (deny-by-default traversal).
- **Graph Ingest:** `packages/graph/ingest/gdelt_upsert.ts` (idempotent, deterministic).
- **Decision Ledger:** `governance/decisions/ADR-AG-*.md` for promotion decisions.

## MAESTRO Security Alignment
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** data poisoning, prompt injection via retrieved snippets, query-cost DoS, cross-scope inference leakage, policy bypass attempts.
- **Mitigations:** policy-compiled traversal firewall, partition-enforced queries, evidence bundles, scoped TTL claims, audit logging, and determinism gates.

## Implementation (All Files, Governed Paths)
### PR-1: Connector Skeleton + Evidence Framework
- `connectors/gdelt_gkg/fetch_raw_index.ts` — deterministic file index + checksum verification.
- `connectors/gdelt_gkg/parse_gkg_v21.ts` — clean-room parser aligned to codebook.
- `packages/evidence/` — evidence bundle emitters (report/metrics/stamp).

### PR-2: BigQuery Ingest Mode (Optional Build Tag)
- `connectors/gdelt_gkg/bigquery/query_builder.ts` — partition-pruned AST builder.
- `connectors/gdelt_gkg/bigquery/budget_guard.ts` — hard limits with fail-fast behavior.

### PR-3: Graph Mapping + Idempotent Upserts
- `packages/graph/ingest/gdelt_upsert.ts` — stable ID derivation and replay-safe upserts.

### PR-4: Scoped GraphRAG Retrieval Policies
- `packages/graphrag/policy/QueryPolicy.ts` — deny-by-default traversal rules.
- `evals/gdelt_scope_isolation.eval.ts` — leakage assertions.

### PR-5: Benchmarks + Dashboards
- `evals/lscb_gdelt_narrative.eval.ts` — leakage/drift metrics.
- `evals/gsdb_spike_benchmark.eval.ts` — spike detection metrics.

## Tests
- Determinism replay test: fixed fixture day, checksum verified, zero diff.
- Policy firewall test: no derived claim traversal without `allow_inference=true`.
- Scope isolation test: derived narrative claims never leak between scopes.
- BigQuery partition enforcement test: queries fail without partition predicates.

## Documentation
- `docs/ops/runbooks/gdelt_gkg_ingest.md` — schedule, retries, checksum verification.
- `docs/standards/gdelt_signal_plane.md` — observation vs fact invariants.
- `docs/architecture/gdelt_two_plane_model.md` — model and decision flow.

## CI/CD
- Gate: deterministic ingest on fixture day.
- Gate: partition filter enforcement for BigQuery mode.
- Gate: scope isolation eval (`lscb.leakage_edges == 0`).
- Gate: evidence bundle completeness (report/metrics/stamp).

## PR Package (Required Artifacts)
- **Decision Rationale:** why this change, why now.
- **Confidence Score:** 0–1 with basis.
- **Rollback Plan:** trigger conditions + steps.
- **Accountability Window:** metrics to watch post-deploy.
- **Tradeoff Ledger Entry:** if any cost/risk/velocity impact.

## Forward-Leaning Enhancement (State-of-the-Art)
- **Policy-compiled Graph Views:** generate restricted Cypher views on the fly, audited at build time, to guarantee LLM-visible subgraphs are policy-compliant.

## Future Roadmap (Compressed)
- Stage 0: raw-file ingest + evidence bundles.
- Stage 1: scoped GraphRAG + inference firewall.
- Stage 2: BigQuery mode + budget guardrails.
- Stage 3: benchmarks + drift detection.
- Stage 4: governed promotion pipeline.

**Finality:** This plan is constrained only by governance gates and evidence completeness; execution proceeds in the prescribed PR stack order.
