# Narrative IO — Inference + Convergence Standard

## Purpose

Extend Summit from claim/keyword analytics to inference-and-structure-first detection with deterministic, evidence-anchored outputs.

## Authority & Alignment

- Governance authority: `docs/governance/CONSTITUTION.md`.
- Readiness assertion: `docs/SUMMIT_READINESS_ASSERTION.md`.
- Governing readiness posture: governed exceptions only; additive, reversible changes.

## Scope (Minimal Winning Slice)

Given a corpus snapshot, Summit outputs a deterministic report showing:

1. Shared interpretive defaults.
2. Structural redundancy clusters.
3. Early directional convergence.
4. Narrative IDs that persist across time.

## Definitions (Aligned)

- **Interpretive Defaults**: Presuppositions and implied causal links that shape “common-sense” assumptions.
- **Structural Redundancy**: Similar explanatory logic expressed with different lexicon or metaphors.
- **Convergence Metrics**: Directional implication convergence and speed, not volume/virality.
- **Cross-Temporal Narrative Identity**: Narrative continuity across mutations in lexical content.
- **Pre-normalization**: Early abstract distrust narratives that precede allegations.
- **Role Compression**: Fewer accounts carrying more functions over time.

## Inputs

- Corpus snapshots (Summit ingestion pipeline).
- Optional metadata: timestamps, actor IDs, platform hints.

## Outputs (Deterministic Evidence Pack)

- `interpretive_defaults.json`
- `redundancy_clusters.json`
- `convergence.json`
- `narrative_id_map.json`

Optional: governed graph updates via `src/graphrag/*`.

## Non-Goals

- No censorship or automated takedown logic.
- No truth adjudication.
- No demographic inference or individual targeting.

## Determinism Requirements

- Stable sorting and canonical ordering across outputs.
- Seeded sampling only (if sampling is used).
- Evidence pointers required for every inference.

## MAESTRO Threat Alignment

**MAESTRO Layers**: Data, Agents, Tools, Observability, Security.

**Threats Considered**

- Prompt injection and inference hallucination.
- Structural bias amplification.
- Output misuse for micro-targeting.

**Mitigations**

- Rule+model hybrid extractor with span-anchored evidence.
- Deny-by-default schema for per-user targeting fields.
- Deterministic schema gates and fixture-backed tests.

## Governance & Evidence Discipline

- All outputs are evidence-first and verifiable.
- Any deviation is a governed exception, documented and reversible.
- Artifacts must use the same definitions and authority files referenced above.
