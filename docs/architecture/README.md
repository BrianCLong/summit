# Summit Architecture & Codex Execution Hub

This document is the single entry point for the Summit/IntelGraph architecture corpus and the Codex-driven execution program that keeps the platform aligned with governance, CI, and GA-readiness expectations.

## Purpose and scope
- Provide a curated map to the most authoritative architecture references in this repository.
- Describe the Codex workstreams, merge discipline, and governance dependencies that orchestrate changes safely.
- Capture GA-readiness checkpoints and evidence expectations for releases.

## Architectural map
Use these documents as the canonical references when implementing or reviewing changes:

- **Topology & platform shape:** [`docs/architecture/day1-topology.md`](./day1-topology.md), [`docs/architecture/system-map.png`](./system-map.png), [`docs/architecture/service-dependency-map.md`](./service-dependency-map.md)
- **Cross-cutting concerns:** [`docs/architecture/zero-trust.md`](./zero-trust.md), [`docs/architecture/service-mesh-architecture.md`](./service-mesh-architecture.md), [`docs/architecture/dead-code-policy.md`](./dead-code-policy.md)
- **Data & provenance:** [`docs/architecture/prov-ledger.md`](./prov-ledger.md), [`docs/architecture/provenance-ledger-beta.md`](./provenance-ledger-beta.md), [`docs/architecture/event-schemas.md`](./event-schemas.md)
- **Operational guardrails:** [`docs/architecture/ci-cd-architecture.md`](./ci-cd-architecture.md), [`docs/architecture/dependency-graph.md`](./dependency-graph.md), [`docs/architecture/dependency-risk-table.md`](./dependency-risk-table.md)
- **Resilience & isolation:** [`docs/architecture/blast-radius-report.txt`](./blast-radius-report.txt), [`docs/architecture/tenant-hierarchy-model.md`](./TENANT_HIERARCHY_MODEL.md), [`docs/architecture/cache-policy.md`](./cache-policy.md)
- **Agent Architecture:** [`docs/architecture/mcp-first.md`](./mcp-first.md), [`docs/agents/context-engineering.md`](../agents/context-engineering.md)
- **Intelligence Methodology:** [`docs/architecture/ufar.md`](./ufar.md)
- **Credibility Dynamics:** [`docs/architecture/credibility_dynamics.md`](./credibility_dynamics.md)
- **Signal Analysis:** [`docs/analytics/entropy_signals.md`](../analytics/entropy_signals.md)

## Codex execution program
The Summit Codex Execution Plan runs eight parallel workstreams with explicit boundaries. Each track owns a branch namespace, consumes its authoritative specs, and adheres to the merge order to keep governance first and prevent drift.

| Track | Branch namespace | Inputs (authoritative specs) | Core deliverables |
| --- | --- | --- | --- |
| A — Governance & Agent Ops | `codex/governance-core/*` | `agent-ops.md`, `permission-tiers.md`, `agent-incident-response.md` | Add governance docs verbatim, implement label taxonomy, CODEOWNERS mappings, governance metadata schemas. |
| B — CI Enforcement | `codex/ci-governance/*` | `ci-enforcement.md` | `governance-check.yml`, label validation, path→tier enforcement, PR annotation output. Depends on Track A. |
| C — Zero-Knowledge Deconfliction | `codex/zk-deconfliction/*` | `zk-deconfliction.md`, `zk-threat-model.md` | Protocol abstractions, audit artifact schemas, stub enforcement hooks, CI guards for unsafe changes (scaffolding only). |
| D — Multi-Tenant Isolation | `codex/isolation/*` | `isolation-domains.md`, `blast-radius-model.md` | DB isolation primitives, tenant scoping helpers, CI path protections, chaos tabletop docs. |
| E — Release Trains & Evidence | `codex/release-system/*` | `release-trains.md`, `evidence-bundles.md` | Evidence bundle generator, release workflow YAML, release metadata manifests, rollback logging hooks. |
| F — Agent Budgets & Risk | `codex/agent-budgets/*` | `agent-budgets.md`, `risk-scoring.md` | Budget manifest schemas, CI risk scoring checks, agent stop conditions, audit log wiring. |
| G — Streaming Intelligence Bus | `codex/streaming/*` | `streaming-intelligence.md`, `feature-store.md` | Event log schema, feature definition framework, async processing scaffolds, observability hooks. |
| H — Documentation & GA Assembly | `codex/ga-docs/*` | Cross-links to all tracks | Cross-link all specs, add GA checklist, publish this `docs/architecture/README.md`, verify internal consistency. |

### Merge discipline
1. Governance Core (Track A)
2. CI Enforcement (Track B)
3. Isolation + Budgets (Tracks D & F) in parallel
4. Zero-Knowledge Deconfliction (Track C)
5. Release System (Track E)
6. Streaming Bus (Track G)
7. GA Docs (Track H)

### Governance and review checkpoints
- **Constitution + Meta-Governance:** All tracks must align with [`docs/governance/CONSTITUTION.md`](../governance/CONSTITUTION.md) and [`docs/governance/META_GOVERNANCE.md`](../governance/META_GOVERNANCE.md).
- **Agent Mandates:** Roles and approval boundaries come from [`docs/governance/AGENT_MANDATES.md`](../governance/AGENT_MANDATES.md) and the Living Rulebook at [`docs/governance/RULEBOOK.md`](../governance/RULEBOOK.md).
- **Label taxonomy:** Governance Core publishes the authoritative labels and CODEOWNERS entries; dependent tracks must reference them in CI and path protections.
- **CI standard:** `pr-quality-gate.yml` remains the enforcement source of truth; new workflows must integrate without bypassing it.

### GA readiness checklist (per release train)
- Governance artifacts present and linked (constitution, mandates, rulebook, label taxonomy, CODEOWNERS).
- CI governance checks enabled (label validation, tier-to-path enforcement, PR annotations) and green.
- Isolation and budget controls configured with auditable manifests and path protections.
- Zero-knowledge deconfliction hooks and audit schemas merged (even if runtime-gated).
- Release train assets produced (workflow YAML, evidence bundle generator, metadata manifests, rollback logging hooks).
- Streaming intelligence scaffolds merged with observability and feature definitions.
- Documentation synchronized: this README, cross-linked specs, and GA checklist confirmed.

## Working agreements for contributors
- **Branching:** Use the branch namespaces above to avoid collisions and preserve merge order.
- **Evidence:** Each track should produce artifacts (schemas, workflows, audit logs) that can be included in evidence bundles for GA.
- **Testing:** Prefer the golden path (`make bootstrap && make up && make smoke`) for validation; add focused tests where new CI or schema logic is introduced.
- **Change control:** Avoid squash merges; preserve history with conventional commits and clear authorship.

## Innovation posture
Each track should propose at least one forward-leaning enhancement (e.g., stronger type safety in governance schemas, novel CI annotations for enforcement drift, or advanced streaming feature derivations) while keeping compatibility with the mandated specs and merge discipline.
