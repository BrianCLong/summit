# Influence Ops Suite v1

## Purpose

Influence Ops Suite v1 defines Summit's first-class specialization for influence operations defense.
The suite is governed, deterministic, and evidence-first by default, with explicit provenance on
all derived artifacts.

## Scope

### In Scope

- CIB detection and coordination analytics.
- Narrative diffusion and evolution tracking.
- Attribution confidence scoring with HITL gates.
- Cross-platform entity resolution (privacy-minimized).
- Synthetic media signals (non-assertive, evidence-backed signals only).
- Export-ready outputs (STIX/MISP) with audit trails.

### Out of Scope (Intentionally constrained)

- Unbounded collection or platform ToS bypass.
- Hard attribution without human review.
- Cross-tenant data sharing without signed policy.

## Capabilities

1. **Narrative analysis and attribution**
   - Narrative clustering and lineage tracking.
   - Attribution confidence scoring with reviewer lineage.
2. **Platform specialization**
   - API-first collection with governed exceptions when permitted.
   - Ephemeral content capture with retention rules and provenance.
3. **Advanced techniques**
   - Synthetic media signals and perceptual hashing.
   - Cross-platform entity resolution with feature flags default-safe.

## Canonical Data Model (Domain Layer: `influence_ops`)

### Entities

- `Account`, `Persona`, `Channel`, `Post`, `Media`
- `Narrative`, `Claim`, `Campaign`, `ActorHypothesis`

### Relations

- `AMPLIFIES`, `COORDINATES_WITH`, `REPOSTS`, `DERIVES_FROM`
- `TARGETS`, `LOCALIZES_TO`, `LIKELY_SAME_AS`

### Required Fields

- `provenance_id` (immutable source chain)
- `observed_at`, `first_seen_at`, `last_seen_at`
- `confidence` and `confidence_method`
- `tenant_id`, `region_id`, `retention_class`

## Evidence-First Outputs

Each analytic job MUST emit the following artifacts:

- `report.json`
- `metrics.json`
- `stamp.json` (Evidence ID: `EVID-IOPS-YYYYMMDD-<slug>-<gitsha7>`)

## Determinism Contract

- Stable ordering on all graph queries.
- Seeded randomness for models and clustering.
- Version pinning recorded in `stamp.json`.
- Deterministic replay gates in CI before merge.

## Human-in-the-Loop (HITL) Gates

- Attribution exports require reviewer approval and audit stamps.
- Identity resolution exports require privacy compliance approval.

## Compliance & Provenance

- Provenance stamped on every edge and derived claim.
- Policy-as-code gates enforce collection constraints.
- All audit exports are immutable and tenant-scoped.

## Forward Generalization

The Influence Ops Suite is designed as a reusable platform module. Adjacent domains (supply-chain,
geopolitical risk, brand protection) reuse the same graph/orchestration/provenance core with
context-specific schema overlays and playbooks.
