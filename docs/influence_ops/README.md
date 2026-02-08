# Influence Ops Suite v1

## Purpose

This domain defines Summit's governed influence-operations specialization for campaign analysis,
narrative diffusion, attribution confidence scoring, cross-platform entity resolution, and synthetic
media signals.

This implementation is constrained by:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`

## Scope

- CIB motif and temporal coordination detection
- Narrative evolution and cross-lingual linking
- Attribution confidence as hypothesis scoring (never unreviewed fact claims)
- Cross-platform `LIKELY_SAME_AS` hypotheses under privacy-minimizing controls
- Synthetic media detection as probabilistic signals

## Canonical Data Model

Entities:

- `Account`, `Persona`, `Channel`, `Post`, `Media`, `Narrative`, `Claim`, `Campaign`, `ActorHypothesis`

Relations:

- `AMPLIFIES`, `COORDINATES_WITH`, `REPOSTS`, `DERIVES_FROM`, `TARGETS`, `LOCALIZES_TO`, `LIKELY_SAME_AS`

Determinism requirements:

- Stable sort on all graph exports
- Fixed seeds for model/eval execution
- Dependency/version capture in evidence `stamp.json`

## Evidence Contract

Every influence-ops analytic run emits:

- `report.json`
- `metrics.json`
- `stamp.json`

Evidence ID pattern:

- `EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`

## Non-Negotiable Constraints

- No attribution export without HITL review stamp
- No privacy-expansive entity resolution features enabled by default
- No collection method outside the collection constraints matrix
- No cross-tenant sharing without signing and policy checks
