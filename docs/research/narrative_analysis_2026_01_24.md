# Narrative Analysis & Information Operations Research Update (2026-01-24)

## 1. Structured Extraction Table

| Insight Source                                            | Research Finding                                                                                                                                        | Summit Component                                    | Action Item                                                                                                                                           |
| :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nature** (Russian Anti-War Discourse on X)              | Mixed NLP + network + BEND framing analysis reveals that anti-war and pro-government narratives diverge by **actor-community topology**, not just text. | `InfluenceOperationsEngine` / `NarrativeEngine`     | Add **actor-community topology** features (`communityId`, `bridgeScore`, `roleLabel`) to narrative snapshots; bind BEND framing to propagation paths. |
| **The Guardian** (AI Bot Swarms)                          | Coordinated AI bot swarms emulate human interaction and self-organize; **coordination patterns and provenance** become primary detection signals.       | `CoordinationGraphService` / `ProvenanceLedger`     | Ship coordination anomaly detectors (temporal coupling + shared content signatures); enforce provenance capture on high-risk narratives.              |
| **Discovery Alert** (Critical Minerals Narrative Warfare) | Narrative manipulation now targets **economic supply chains**, shifting investor and policy sentiment via selective amplification.                      | `DomainContext` / `MarketNarrativeMonitor`          | Extend domain ontology with `CriticalMinerals` sector; add market-specific volatility and rumor-propagation thresholds.                               |
| **PNAS** (Integrated Influence Detection)                 | End-to-end influence detection is strongest when **content, network, and actor modeling** are fused with human-in-the-loop triage.                      | `InfluenceDetectionService` / `CaseWorkflows`       | Add multi-signal fusion score with analyst override logging to provenance ledger.                                                                     |
| **MIT LL** (Influence Ops Recon)                          | Semantic analysis + retweet graph reconstruction reliably exposes **operational structure** of influence campaigns.                                     | `GraphIngestionService` / `NarrativeGraphAssembler` | Expand reconstruction pipeline to persist inferred coordination edges with confidence.                                                                |
| **Frontiers** (Cognitive Warfare Narratives)              | Detection accuracy improves when **emotional resonance and framing tactics** are modeled alongside semantics.                                           | `NarrativeClassifier` / `SentimentPipeline`         | Add emotional valence + persuasion tactic tags to narrative events.                                                                                   |
| **arXiv** (Narrative Polarization)                        | Polarization can be formalized by quantifying **role/motif divergence** across partisan audiences.                                                      | `PolarizationIndex` / `NarrativeRoleModel`          | Introduce motif-role extraction and a polarization index for narrative drift alerts.                                                                  |

## 2. Proposed Schema / Model Deltas

### Narrative State (`packages/narrative-engine/src/core/types.ts`)

**New Enums & Interfaces:**

```typescript
// Community topology attribution
export interface CommunityTopology {
  communityId: string;
  bridgeScore: number; // 0-1 betweenness proxy
  roleLabel: "Bridge" | "Hub" | "Peripheral";
}

// Emotional + persuasion overlays
export type EmotionalValence = "Positive" | "Negative" | "Mixed" | "Neutral";
export type PersuasionTactic =
  | "Fear"
  | "MoralOutrage"
  | "Identity"
  | "Authority"
  | "Scarcity"
  | "Other";

export interface NarrativeSignals {
  framing?: FramingType;
  emotionalValence?: EmotionalValence;
  persuasionTactics?: PersuasionTactic[];
  community?: CommunityTopology;
}
```

### Graph Ontology (`server/src/ontology`)

- **Node**: `Narrative`
  - Property: `emotionalValence` (String/Enum)
  - Property: `persuasionTactics` (String[])
  - Property: `communityId` (String)
- **Relationship**: `COORDINATES_WITH`
  - Property: `temporalCoupling` (Float)
  - Property: `contentSignatureOverlap` (Float)
  - Property: `confidence` (Float)

### Domain Context (`server/src/influence/DomainContext.ts`)

- Add `CriticalMinerals` as a domain sector.
- Add `marketVolatilityThreshold` and `rumorPropagationRate` to sector config.

## 3. Detection Module Specs

### A. Coordination Swarm Detector

- **Goal**: Flag AI-swarm-like coordination.
- **Inputs**: Time-aligned posts, provenance events, graph edges (`COORDINATES_WITH`).
- **Logic**:
  - Compute `temporalCoupling` (burst synchronization).
  - Compute `contentSignatureOverlap` (shingled hash overlap).
  - **Signal**: If both exceed thresholds, raise `SwarmCoordinationAlert`.
- **Output**: `Alert { type: 'SwarmCoordination', confidence: 0.9 }`.
- **Failure Mode**: Legitimate flash-mob or breaking-news surges (guard by provenance + account age).

### B. Narrative Polarization Index

- **Goal**: Quantify narrative divergence between audiences.
- **Inputs**: Narratives grouped by audience segment or community.
- **Logic**:
  - Extract roles/motifs with LLM-assisted classifiers.
  - Compute divergence score (JS divergence + motif overlap penalty).
- **Output**: `PolarizationIndex { narrativeId, score, primaryMotifs }`.

### C. Emotional Framing Overlay

- **Goal**: Improve detection accuracy by factoring emotional drivers.
- **Inputs**: Narrative text + BEND framing output.
- **Logic**:
  - Joint classifier for `emotionalValence` and `persuasionTactics`.
  - Fuse with framing and community topology for final risk score.
- **Output**: `NarrativeRiskScore { score, contributors }`.

## 4. Executive & Market Positioning Extract (Internal Memo)

**To:** Leadership Team
**From:** Jules (Research & Product Engineering)
**Date:** 2026-01-24
**Subject:** Market-Ready Narrative Intelligence for Coordinated AI Swarms

**Summary**
The latest evidence confirms that **coordination signals + provenance** outperform text-only detection for emergent AI bot swarms. The anti-war discourse study shows that **actor-community topology** dictates narrative flow, while economic narrative warfare proves influence operations now target **market decision systems**. Summit must operationalize community-aware framing, provenance-first detection, and market context controls now.

**Readiness Assertion Alignment**
Execution is aligned with the Summit Readiness Assertion in `docs/SUMMIT_READINESS_ASSERTION.md`, and delivery is intentionally constrained to governance-compliant, provenance-first upgrades.

**Differentiation**
Summit’s advantage is a **graph-native, provenance-first intelligence layer** that fuses:

1. **Community Topology** (who bridges narratives)
2. **Coordination Signals** (synchronized bursts + content signatures)
3. **Emotional Framing** (persuasion tactics + BEND)

**Recommendation**
Ship the Coordination Swarm Detector and Narrative Polarization Index in Q2 2026 to open adjacent **financial risk** and **supply-chain integrity** markets. This is a governed exception to legacy text-only detection paths and replaces them with evidence-grade multi-signal fusion.
