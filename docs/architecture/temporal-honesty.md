# Temporal Honesty Architecture (Baseline)

## Readiness Anchor

This baseline is anchored to the Summit Readiness Assertion and the governing policy stack, and it
must align definitions, authority files, and evidence artifacts across all implementations.
Refer to: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`, and
`docs/governance/META_GOVERNANCE.md`.

## Purpose

Temporal Honesty is the platform mandate that every assessment is time-bounded, assumption-scoped,
replayable, and governed. It treats absence/latency/access-drift as first-class signals, applies
deterministic confidence decay, and prevents scope leakage through explicit leases and guards.

## Principles

1. **Time-Bounded Assertions:** All outputs carry validity windows and refresh requirements.
2. **Assumption-Scoped Outputs:** Every artifact is bound to explicit assumptions and constraints.
3. **Evidence-First Artifacts:** Evidence bundles are emitted before narrative summaries.
4. **Determinism by Default:** Canonical ordering, stable hashing, and replayable pipelines.
5. **Governed Exceptions:** Any deviation is captured as a governed exception with approval,
   expiry, and audit trail.

## Core Primitives

### Temporal Manifest (TSM)

A required input/output envelope capturing:

- Observation window (start/end)
- Missingness assumptions (baseline, confounders)
- Expected propagation windows
- Access state (perspective aging)
- Deterministic rounding rules

### Confidence Lease (CDE)

A lease that decays over time unless refreshed:

- Decay curve + refresh trigger
- Minimum evidence requirements
- Expiry and renewal policy
- Override lease with explicit approval

### Assumption Scope (ASO)

A guard preventing reuse outside allowed scope:

- Explicit assumptions (source constraints, time bounds)
- Allowed consumers (policy + role)
- Output reuse constraints

## Evidence Artifacts

All Temporal Honesty runs emit a deterministic evidence bundle:

- `evidence/report.json` — inputs, manifests, assumptions, decisions
- `evidence/metrics.json` — latency/absence/access drift stats, decay deltas
- `evidence/stamp.json` — evidence ID, schema versions, config hashes, replay pointers

Evidence IDs use the stable pattern: `EVID::<domain>::<yyyy-mm-dd>::<surface>::<gitsha8>::<runid8>`.

## Integration Surface (Baseline Modules)

- `packages/temporal-signals/`
  - `absence.ts` (negative-space metrics)
  - `latency.ts` (time-to-appearance / propagation)
  - `access_drift.ts` (perspective aging)
- `packages/confidence-decay/`
  - `curves.ts`, `lease.ts`, `refresh.ts`
- `packages/assumption-scope/`
  - `assumptions.schema.json`, `scope_guard.ts`
- `packages/credibility/`
  - `commitment_cost.ts`, `completeness.ts`, `temporal_anchor.ts`
- `packages/evidence-kit/`
  - deterministic report/metrics/stamp emitters

## Policy Gates

- Temporal Manifest required for standing assessments
- Scope guard enforced for all output reuse
- Decay applied to all long-lived conclusions
- Silence alerts rate-limited and confounder-adjusted

## Risk Controls

- **Absence Misattribution:** Confounder checks are mandatory before actioning silence alerts.
- **Cost Bias:** Commitment-cost scoring requires fairness calibration.
- **Stale Certainty:** Confidence decay is enforced and visible in UI/API responses.
- **Scope Leakage:** Guardrails reject reuse outside assumption/time constraints.

## MAESTRO Security Alignment

**MAESTRO Layers:** Data, Agents, Tools, Observability, Security.

**Threats Considered:**

- Goal manipulation via stale conclusions
- Prompt injection to bypass scope guards
- Tool abuse to suppress confounder checks

**Mitigations:**

- Lease expiration + enforced refresh policies
- Scope guard enforcement at API + UI
- Deterministic evidence bundles and audit logs

## Execution Notes

- Outputs must remain aligned to authority files (Readiness Assertion + Governance) with no
  divergent definitions.
- Any deviation is logged as a governed exception with explicit approval and expiration.
- Decisions are recorded as evidence artifacts to preserve replayability.

## Next Actions (Authoritative)

1. Add Temporal Manifest schema and enforcement gate.
2. Ship Assumption Scope guard with scope-leak evals.
3. Introduce Confidence Lease in standing assessments.
4. Build confounder-aware absence and latency metrics.

