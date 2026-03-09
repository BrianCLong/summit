# Palantir-Class Readiness Assessment and Build Roadmap

## Summit Readiness Assertion
This roadmap is intentionally constrained to **graph-first, evidence-first, governed execution** so delivery remains deployable while reducing architecture drift.

## Current Posture (Best-Effort)

Legend: `solid` / `partial` / `early` / `missing`

| # | Component | Posture | Confidence | Notes |
|---|---|---|---|---|
| 1 | Ontology & semantic layer | partial | medium | Direction exists; hardened versioning/migrations not uniformly enforced. |
| 2 | Entity resolution engine | early | low-medium | Extraction appears present; probabilistic ER and merge governance need hardening. |
| 3 | Temporal intelligence | early | low | Mostly timestamp-level capability; first-class temporal semantics remain limited. |
| 4 | Provenance & attribution | partial | medium-high | Strong governance intent; enforceability appears uneven across pathways. |
| 5 | Ingestion framework | partial | medium | Multi-source intent exists; connector SDK and lifecycle standardization remain key gaps. |
| 6 | Narrative & influence modeling | early | low | Conceptual emphasis exists; dedicated subsystem needs explicit schema + analytics. |
| 7 | Autonomous investigation agents | partial | medium | Multi-agent structure exists; graph write contracts and eval gates must be universal. |
| 8 | Graph analytics engine | early | low-medium | Basic graph capability likely available; repeatable explainable analytics layer is limited. |
| 9 | Investigation workspace UX | early | low | Core workspace primitives are not yet consistently productized end-to-end. |
| 10 | Governance & access control | partial | medium-high | Policy posture is strong; ubiquitous runtime enforcement remains the finishing gap. |
| 11 | Sovereign deployment capability | early | low-medium | Architecture intent exists; offline/reproducible deployment kit needs completion. |
| 12 | Developer/plugin ecosystem | missing | medium | Platform contracts and registry model are not yet formalized as default extension path. |

## Ordered Delivery Plan

> Sequence is optimized for compounding value and minimal rewrites.

### Phase 0 (Week 0-1): Lock the Platform Contract
- Publish canonical data contract v1: `Entity`, `Event`, `Relationship`, `Evidence`, `Claim`, `Narrative`.
- Enforce required fields: `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`.
- Adopt graph-as-system-of-record rule for all final outputs.
- Introduce ontology versioning and migration flow.

### Phase 1 (Weeks 1-3): End-to-End Evidence + Provenance
- Harden source/extraction/transformation lineage models.
- Add investigation-scoped evidence binder.
- Enforce boundary policy: reject claims lacking source + extraction references.

### Phase 2 (Weeks 2-6): Connector SDK and Ingestion Job Model
- Standard connector lifecycle: `discover -> fetch -> normalize -> extract -> load`.
- Add idempotent queue/job model with retries and deterministic run records.
- Implement baseline connectors: RSS/news, filings, sanctions, court/public records, social capture.

### Phase 3 (Weeks 4-8): Ontology Governance + Entity Resolution v1
- Add type/relation registries, schema linting, CI policy checks.
- Implement alias table + canonical IDs, fuzzy matching, merge/unmerge with audit trail.

### Phase 4 (Weeks 6-10): Temporal Intelligence
- Add `valid_from`, `valid_to`, `observed_at` semantics for edges/events.
- Enable as-of time-slicing queries and contradictory-claim coexistence with confidence.

### Phase 5 (Weeks 8-12): Repeatable Graph Analytics
- Deliver analytics jobs for community detection, centrality, anomaly, and flow.
- Persist derived artifacts to graph with complete provenance.

### Phase 6 (Weeks 10-14): Investigation Workspace v1
- Add investigation object + tabs: timeline, graph, evidence binder, hypothesis board, reports.
- Enforce pin-and-cite workflow to preserve evidence traceability.

### Phase 7 (Weeks 12-18): Autonomous Investigation Agents
- Require structured graph writes from agents.
- Add verifier/critic gates and regression eval harness before graph merge.
- Support continuous monitoring investigations via subscriptions.

### Phase 8 (Weeks 16-22): Governance Everywhere
- Apply ABAC/OPA to graph IO, connector access, tool usage, and export pathways.
- Enforce full audit and redaction/data handling pathways.

### Phase 9 (Weeks 18-26): Sovereign Deployment Kit
- Ship reproducible profiles for Docker/Kubernetes + offline bootstrap bundles.
- Add signed artifact update channels and laptop/cluster operating modes.

### Phase 10 (Weeks 22-30): Plugin Ecosystem
- Define plugin contracts for connectors, analytics, UI panels, and agent skills.
- Publish compatibility/version policy and bootstrap internal plugin registry.

## Non-Negotiable Ordering
1. Provenance
2. Ingestion SDK
3. Ontology + ER
4. Temporal
5. Analytics
6. Workspace
7. Agents
8. Governance ubiquity
9. Sovereign deployment
10. Plugin ecosystem

## Immediate 7-Day Risk Reduction Plan
1. Ship canonical graph contract v1.
2. Enforce evidence-required writes at graph boundary.
3. Implement connector SDK skeleton and one production connector path.
4. Add ontology versioning + schema lint gate in CI.
5. Start ER v1 with alias table + merge audit workflow.

## MAESTRO Alignment Snapshot
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats considered:** prompt injection, evidence spoofing, connector abuse, policy bypass, graph poisoning.
- **Mitigations:** policy-gated writes, provenance hard requirements, deterministic job records, verifier gates, ABAC/OPA across IO paths.
