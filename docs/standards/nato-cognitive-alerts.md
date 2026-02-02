# NATO-Style Cognitive I&W Alerts (Pattern-First)

## Purpose
Summit implements a defensive, auditable Cognitive I&W module that tracks narrative patterns and
coordination dynamics rather than adjudicating truth or intent. Alerts are designed to be
machine-verifiable and reproducible, with feature flags defaulted to OFF.

## Ground-Truth Claims (Traceable Anchors)
- **ITEM:CLAIM-01**: Dashboard for suspected campaigns with real-time visualizations and ML/AI
  pattern discovery.
- **ITEM:CLAIM-02**: TweetWatch-style monitoring of negative emotion and virality signals.
- **ITEM:CLAIM-03**: Mitigation should target dynamics, not individual messages.
- **ITEM:CLAIM-04**: Integrated early-warning systems track timing, emotional spikes, and
  cross-platform coordination.
- **ITEM:CLAIM-05**: Use of LLMs for linguistic markers of manipulation (optional, defensive-only).
- **ITEM:CLAIM-06**: Narrative synchronization with geopolitical events and milestones.
- **ITEM:CLAIM-07**: Defensive work must stay within legal and ethical boundaries.

## Design Principles
1. **Pattern-first indicators**: timing, emotion spikes, coordination, and convergence.
2. **No truth adjudication**: alerts summarize dynamics only.
3. **Deterministic evidence**: evidence IDs and artifacts are reproducible for auditability.
4. **Feature-flagged OFF**: default deny for risky capabilities.
5. **Privacy-preserving**: hash content/actor identifiers; never store raw text by default.

## Inputs & Outputs

### Inputs (MWS)
- JSONL event streams with derived features (emotion, virality, coordination keys).

### Outputs (MWS)
- **Alert objects** conforming to `api-schemas/cognitive-iw/alert.schema.json`.
- **Evidence artifacts**: `report.json`, `metrics.json`, `stamp.json`.

## Non-Goals
- Attribution of actors beyond transparent heuristics.
- Automated takedowns or counter-narrative generation.
- Targeting individuals or adjudicating intent.

## Feature Flags
- `cognitive_iw_enabled`: master flag, default OFF.
- `cognitive_iw_llm_enabled`: optional, defensive-only analyzer (default OFF).

## Evidence ID Convention
- `EVID:nato-cognitive-alerts:<sha256-8>`

## Governance Alignment
All artifacts must align with Summit governance standards, including auditability, reproducibility,
and compliance with the Constitution of the Ecosystem.

## MAESTRO Alignment
- **MAESTRO Layers**: Foundation, Data, Observability, Security.
- **Threats Considered**: coordinated abuse, poisoned inputs, privacy leakage.
- **Mitigations**: feature flags default OFF, deterministic evidence, hashed identifiers with
  redaction-only outputs.
