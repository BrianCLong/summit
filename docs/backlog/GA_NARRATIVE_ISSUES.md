# GA Narrative Intelligence Backlog

The following issues are critical for the MVP-3/MVP-4 milestones and GA readiness, based on the Research Update (2026-01-22).

## MVP-3: Core Narrative Capabilities

### [NARR-001] Implement BEND Framing Classifier
- **Area**: Narrative Engine / NLP
- **Priority**: High (P1)
- **Description**: Integrate a classifier to tag narrative events with BEND (Backing, Explanation, Negation, Denial) framing types.
- **Acceptance Criteria**:
  - `NarrativeAnalysisService` accepts text and returns `FramingType`.
  - Precision > 80% on test dataset.
  - Integration with `NarrativeState` (add property to Event).
- **Evidence**: EVID-NARR-002

### [NARR-002] Expand Narrative Domain Context (Market Warfare)
- **Area**: Narrative Engine / Schema
- **Priority**: High (P1)
- **Description**: Update the ontology and services to support "Economic" and "Market" domains for narrative tracking, driven by Critical Minerals warfare research.
- **Acceptance Criteria**:
  - `Domain` enum includes `Economic`.
  - `Narrative` nodes support `marketSectors` list.
  - UI displays market-specific volatility indicators.

## MVP-4: Advanced Detection

### [DET-001] Scalable Synthetic Amplification Detection
- **Area**: Detection Service
- **Priority**: Critical (P0) - *Response to 700% AI IO Projection*
- **Description**: Implement `SyntheticAmplificationDetector` to flag high-velocity, low-variance content streams indicative of DaaS/Botnets.
- **Acceptance Criteria**:
  - Detects amplification networks > 50 nodes in < 1 minute.
  - False positive rate < 5% on organic viral content.
  - Horizontal scaling support (worker queues).
- **Evidence**: EVID-IO-001

## Governance & Evidence

### [GOV-001] Narrative Model Evidence Collection
- **Area**: Governance
- **Priority**: Medium (P2)
- **Description**: Implement automated collection of `EVID-NARR-001` (Snapshot Integrity) and `EVID-NARR-002` (Ethical Checks).
- **Acceptance Criteria**:
  - `generate_evidence_bundle.sh` includes narrative snapshots.
  - Governance dashboard reflects narrative model status.
