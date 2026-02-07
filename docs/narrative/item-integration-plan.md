# ITEM Integration Plan: Narrative Frame + Influence Strategy Detection

## Readiness assertion

This plan asserts present readiness and mandates next actions under the Summit Readiness Assertion. See `docs/SUMMIT_READINESS_ASSERTION.md` as the governing readiness authority and baseline for GA evidence posture.

## Scope

**Objective:** integrate narrative frames, influence strategy taxonomy, actor/community overlays, and impact-aware evaluation into Summit’s governed narrative pipeline.

**Disposition:** INTEGRATE — schema-level concepts + evaluation objectives; do not adopt any single external model wholesale.

## Present state (asserted)

- Summit already enforces evidence-first, deterministic artifacts for governed changes.
- Narrative operations are tracked as governed documentation workstreams.
- The narrative pipeline is ready to accept structured schema expansions and evaluation gates.

## Future state (mandated)

### Core objects

- **Frame**: problem, cause, blame/agent, victim/target, solution, moral value, emotion, temporal anchor.
- **Narrative**: ordered collection of frames + stability over time.
- **StrategyEvent**: influence strategy labels + evidence edges (content, actor, amplification traces).
- **ActorCommunity**: community id + role distribution + bot-likelihood signals + platform presence.
- **ImpactSignal**: observed or proxied behavior-shift indicators.

### Data plane (deterministic-first)

1. Ingest → normalize → canonicalize
2. Content + network features
3. Frame extraction (structured)
4. Strategy inference (multi-label)
5. Graph write (evidence edges)
6. Scoring: novelty, coordination likelihood, cross-domain diffusion, impact proxy

## MAESTRO alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** evasion via paraphrase, poisoning via flooding, prompt injection, false-flag attribution pressure, cross-tenant leakage
- **Mitigations:** schema-validated outputs, bounded field constraints, deterministic runs, strict separation of labeling vs attribution, evidence-first artifacts with redaction, tenant-scoped artifacts

## Governed PR stack (PR1–PR6)

### PR1 — Schema + Storage

- Add narrative schemas: frame, strategy_event, actor_community
- Add storage migration and schema round-trip tests
- Evidence: schema hashes + migration checksums

### PR2 — Influence Strategy Taxonomy (IST v1)

- Implement strategy labels + rule scaffolding + model interface
- Determinism gate: same input → same output
- Evidence: per-strategy precision/recall on synthetic evals

### PR3 — Frame Extraction (Frame Graph Builder v1)

- Frame extraction + canonicalization + graph writer
- Eval on labeled miniset with determinism proof
- Evidence: redacted graph sample counts in report bundle

### PR4 — Actor/Community & Bot-Aware Signals

- Community detection + actor features + bot-likelihood signals
- Stability eval (NMI/ARI) under perturbations
- Evidence: runtime bounds and stability metrics

### PR5 — Cross-domain Transfer Pack

- Economics/critical minerals adapters + transfer eval
- Evidence: transfer delta + calibration curves

### PR6 — Analyst Workflow + Evidence Browser

- UI: narrative timeline, strategy trace, community map
- Evidence: rendered snapshots metadata only

## Evaluation gates (GA grade)

1. Frame extraction quality: schema validity + determinism + labeled miniset agreement
2. Strategy detection: per-strategy PR curves + confusion matrix
3. Community stability: perturbation robustness
4. Cross-domain transfer: bounded performance delta
5. Impact proxy: NDCG@K + calibration error

## Evidence bundle standard

- `artifacts/EVID-<date>-<component>-<gitsha7>/report.json`
- `artifacts/EVID-<date>-<component>-<gitsha7>/metrics.json`
- `artifacts/EVID-<date>-<component>-<gitsha7>/stamp.json`

## Governance constraints

- No direct actor attribution without corroboration.
- Deterministic evidence required for every run.
- All regulatory logic expressed as policy-as-code.

## Decision framing

- **Deferred pending:** platform validation for storage layers and evaluation harness scope.
- **Intentionally constrained:** no open-ended graph traversal; evidence budgets mandated.

## Next actions (final)

1. Approve PR1–PR6 stack sequence and evidence gates.
2. Bind eval thresholds to risk tier and enforce determinism in CI.
3. Gate UI exposure behind evidence completeness checks.

