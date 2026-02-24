# Narrative Dominance Technologies (Defense-Only) Standard

## Purpose
Narrative Intelligence is a defense-only capability that detects narrative clusters, coordination signals, and amplification anomalies, and produces auditor-ready evidence artifacts without enabling offensive influence operations.

## Scope Guardrails
- Defense-only: no generation, optimization, targeting, or amplification of persuasive disinformation.
- Feature-flag default OFF for any dual-use automation.
- Deny-by-default for ingestion sources, exports, and automation.
- No refactors outside integration seams (logging, evidence, connectors).

## Minimal Winning Slice (MWS)
Given a stream of public posts/articles, Summit clusters narrative candidates, detects coordination anomalies, and emits a signed, reproducible evidence bundle with a dashboard view.

### Acceptance Tests (MWS)
- `narrative_clusterer` groups ≥100 mixed-topic documents into clusters with stable IDs across reruns for the same input/config.
- `coordination_anomaly` flags at least one synthetic “burst + cross-account similarity” fixture.
- `report.json`, `metrics.json`, `stamp.json` emit with no nondeterministic timestamps and a deterministic `evidence_id`.
- API/UI returns clusters, top exemplars, propagation summary, and anomaly reasons.

## Evidence Contract (Deterministic)
- Evidence ID format: `EVD-NARR-<sha256_12>`.
- Evidence hash input: `canonical_inputs_manifest + pipeline_version + config_json`.
- Deterministic artifacts: `report.json`, `metrics.json`, `stamp.json` contain no timestamps.
- Logs may include timestamps; artifacts must not.

## Operationalization Extensions (High-Signal)
These extensions harden operational narrative intelligence while preserving determinism and provenance. Governance posture follows the Summit Readiness Assertion and enforcement gates in `docs/SUMMIT_READINESS_ASSERTION.md`.

### Narrative Debt (Detection + Accounting)
- **Definition:** Early framing shortcuts (vagueness, hedging, implied causality) create “narrative debt” that constrains later clarification.
- **Detection signal:** Iterations that cannot specify claims without breaking prior coherence.
- **Operationalization:** Track a `debt_index` per narrative cluster derived from (a) hedging density, (b) later-iteration contradiction cost, and (c) assumption divergence drift. Preserve historical debt snapshots in evidence bundles.

### Audience Partitioning Inside a Single Narrative
- **Definition:** Single narrative embeds polysemous phrases to allow divergent audience interpretations.
- **Detection signal:** Identical fragments map to divergent downstream discourse clusters.
- **Operationalization:** Maintain `fragment→audience_cluster` bipartite edges with divergence scores; flag fragments whose entropy exceeds policy thresholds.

### Narrative Exhaustion Attacks
- **Definition:** Operations that fatigue audiences into disengagement by normalizing ambiguity and procedural delay.
- **Detection signal:** Sustained emphasis on complexity, uncertainty, and endless process without directional claims.
- **Operationalization:** Track `exhaustion_ratio = (ambiguity_tokens + delay_tokens) / directional_claim_tokens` with a minimum window length; emit evidence when the ratio breaches baseline bands.

### Assumption Modeling (Beyond Topic/Frame)
- **Definition:** Extract implicit assumptions that must hold for the narrative to make sense.
- **Detection signal:** Stable assumptions persisting across paraphrase/translation.
- **Operationalization:** Promote assumptions to first-class nodes (`assumption_id`, `lineage`, `confidence`, `supporting_evidence`), link to claims and artifacts, and track mutation deltas across time slices.

### Narrative Compression Metrics
- **Definition:** Measure how much context is needed to activate a narrative.
- **Detection signal:** Rapid drop in tokens required to evoke full narrative meaning inside a community.
- **Operationalization:** Track `activation_tokens_p50` and `activation_tokens_p90` per narrative cluster; alert on steep negative slopes beyond threshold.

### Counter-Narrative Absorption
- **Definition:** Counter-claims are echoed verbatim but reframed as supporting context.
- **Detection signal:** Counter-claims embedded as “exceptions that prove the rule.”
- **Operationalization:** Detect verbatim echoes, then measure reframe polarity shift; emit `absorption_events` with evidence references.

### Convergence With Funnel Analytics
- **Definition:** Narrative onboarding follows conversion paths akin to marketing funnels.
- **Detection signal:** Progressive disclosure of claims and trust transfer via peer-like intermediaries.
- **Operationalization:** Model `narrative_funnel_stage` per user path and compute conversion/attrition rates; store path hashes for deterministic replay.

### Narrative Governance as a Strategic Vector
- **Definition:** Governance artifacts used as rhetorical signals more than operational controls.
- **Detection signal:** Governance documents referenced far more than executed.
- **Operationalization:** Compare `governance_reference_rate` vs `governance_execution_rate` using audit logs; flag significant deltas as governance-signaling risk.

### Narrative State Tracking
- **State model:** `seeded → contested → normalized → exhausted`.
- **Operationalization:** Enforce state transitions through evidence-backed thresholds (volume, diversity, assumption stability). Store transitions as immutable events for provenance.

### Narrative Half-Life Metrics
- **Definition:** Measure decay, not just growth.
- **Operationalization:** Compute `half_life_days` for engagement and for assumption stability. Long half-life with low engagement is a coordination signal, not a growth signal.

## Import/Export Matrix (v0)
| Surface | Import | Export | Non-goals |
|---|---|---|---|
| Ingest connectors | RSS/HTTP fetch, allowlisted platform APIs, CSV | normalized `content_event` stream | no private-message scraping |
| Graph | `content_event` → nodes/edges | narrative clusters + propagation edges | no truth labeling as fact oracle |
| Analyst UI | cluster summaries, exemplars, anomaly reasons | annotation + case links | no auto-publication |
| Evidence pack | inputs hash list, config hash, results | `report.json`, `metrics.json`, `stamp.json` | no raw PII dumps |

## Claim Registry (Traceability)
| Planned element | Claim basis |
| --- | --- |
| Narrative clustering (semantic, not keywords) | ITEM:CLAIM-06 |
| Coordination/anomaly signals (bursts, reuse, networks) | ITEM:CLAIM-06, ITEM:CLAIM-04 |
| Risk scoring + prioritization | ITEM:CLAIM-06, ITEM:CLAIM-07 |
| Evidence bundle + auditability | Summit governance requirement |
| Synthetic-media indicator hooks | ITEM:CLAIM-05 |
| Cognitive-warfare framing in docs (context only) | ITEM:CLAIM-08, ITEM:CLAIM-02 |
| Counter-messaging automation (OFF) | Summit risk mitigation |

## Threat-Informed Requirements
| Threat | Mitigation | Gate | Test fixture |
| --- | --- | --- | --- |
| Data poisoning | robust clustering + outlier caps + per-source weights | `narrative_poisoning_tests` | synthetic poison corpus |
| Prompt/HTML injection in UI | sanitization + escaping | `web_security_lint` | malicious HTML payload |
| False attribution harm | confidence tiers + analyst confirmation | export blocked without human annotation | export-block test |
| Model drift | pinned model + drift detector | scheduled drift job | stability comparison |
| DoS via huge inputs | size caps + backpressure | perf budget gate | oversized docs |
| Privacy leakage | PII redaction + never-log list | data handling tests | PII fixture corpus |

## MAESTRO Security Alignment
- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, data poisoning, false attribution, tool misuse, evidence tampering.
- **Mitigations:** deterministic artifacts, human confirmation gates, sanitization, deny-by-default connectors, evidence hashing.

## Governance Defaults
- Feature flag: `NARRATIVE_INTEL=off` by default.
- Exports: blocked unless analyst annotation is present and the tenant is allowlisted.
- Evidence artifacts: stored as deterministic JSON with schema validation.

## Roll-forward Plan
1. Ship behind flag (OFF).
2. Enable in staging with tenant allowlist.
3. Expand with explicit approvals and audit-ready evidence packs.

## Non-Goals
- Offensive influence tooling.
- Automated counter-messaging.
- Direct operator targeting or amplification automation.
