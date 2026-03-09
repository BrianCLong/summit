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
