# Narrative Analysis & Information Operations Research Update (2026-02-08)

## 1. Structured Extraction Table

| Insight Source                       | Research Finding                                                                                                                                   | Summit Component                                             | Action Item                                                                                                   |
| :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Internal Synthesis** (Epistemic Fatigue) | Narrative operations are optimizing for **epistemic fatigue** by flooding audiences with plausible but unresolved interpretations, making inconsistency a strategic objective. | `NarrativeEngine` / `SensemakingResilience`                   | Add epistemic-fatigue scoring to flag narrative inconsistency as an operational signal, not a quality defect. |
| **Internal Synthesis** (Latency Activation) | Amplification increasingly follows **long dormancy + rapid reactivation** triggered by external events rather than campaign timing.              | `LongHorizonMemory` / `TemporalActivationTracker`             | Track narrative dormancy windows and reactivation spikes as coordination markers.                             |
| **Internal Synthesis** (Narrative Infrastructure) | Influence operations emphasize **reusable narrative infrastructure** (templates, causal logic, moral vocabularies) over single message campaigns. | `NarrativeInfrastructureRegistry` / `FrameGraph`              | Model infrastructure reuse across unrelated topics as a first-class detection signal.                         |
| **Internal Synthesis** (Frame-Invariant Semantics) | Frame-invariant modeling outperforms topic-centric detection when narratives migrate across domains.                                               | `FrameInvariantModel` / `NarrativeSignatureService`           | Treat frames as primary objects with stable blame/inevitability/constraint signatures.                        |
| **Internal Synthesis** (Activation Thresholds) | Actionable narratives are defined by **activation likelihood**, not reach; mid-credibility repetition and cross-community uptake are key signals. | `ActivationThresholdScorer` / `BehavioralFollowThroughModel`  | Prioritize activation scoring over raw engagement counts in alerts.                                            |
| **Internal Synthesis** (Engineer vs. Carrier Roles) | Low-volume, high-consistency **narrative engineers** outpace high-volume carriers in strategic importance.                                         | `RoleAttributionService` / `ActorConsistencyProfiler`         | Build role classification for engineer vs. carrier to surface high-leverage actors.                           |

## 2. Proposed Schema / Model Deltas

### Narrative Infrastructure (`packages/influence-ops/src/narrative/infrastructure.ts`)

```typescript
export interface NarrativeInfrastructure {
  id: string;
  templateLabel: string;
  causalLogicSignature: string;
  moralVocabulary: string[];
  reusableAcrossTopics: boolean;
  evidenceIds: string[];
}

export interface NarrativeInfrastructureReuse {
  infrastructureId: string;
  topics: string[];
  reuseScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
```

### Frame-Invariant Signatures (`server/src/analytics/narrative/signatures.ts`)

```typescript
export interface FrameInvariantSignature {
  blameAssignment: string;
  inevitabilityFrame: string;
  solutionConstraint: string;
  confidence: number;
  evidenceIds: string[];
}
```

### Activation Thresholds (`server/src/analytics/narrative/activation.ts`)

```typescript
export interface ActivationThresholdSignal {
  narrativeId: string;
  midCredibilityRepeats: number;
  crossCommunityAdoptions: number;
  activationScore: number;
  activationState: 'Dormant' | 'Primed' | 'Activated';
}
```

### Actor Roles (`server/src/analytics/narrative/roles.ts`)

```typescript
export type NarrativeRole = 'Engineer' | 'Carrier';

export interface NarrativeRoleAttribution {
  actorId: string;
  role: NarrativeRole;
  crossTopicConsistency: number;
  adaptationVelocity: number;
  evidenceIds: string[];
}
```

## 3. Detection Module Specs

### A. Epistemic Fatigue Index

- **Goal**: Detect campaigns that exhaust evaluation capacity by maximizing narrative inconsistency.
- **Inputs**: Narrative variants, causal frames, topic migrations, resolution gaps.
- **Logic**:
  - Identify parallel explanations with low resolution convergence.
  - Score deliberate reframing frequency and unresolved divergence.
- **Output**: `Alert { type: 'EpistemicFatigue', confidence: 0.82, narratives: [...] }`
- **Failure Modes**: Organic debate; mitigated by role attribution and infrastructure reuse checks.

### B. Latency-Based Amplification Detector

- **Goal**: Flag narratives with long dormancy followed by fast activation.
- **Inputs**: Time-series embeddings, external event triggers, propagation curves.
- **Logic**:
  - Detect dormant windows beyond threshold.
  - Correlate activation with external event alignments.
- **Output**: `Alert { type: 'LatencyActivation', confidence: 0.79, narratives: [...] }`
- **Failure Modes**: Genuine resurfacing; mitigated with infrastructure reuse and engineer-role signals.

### C. Narrative Infrastructure Reuse Graph

- **Goal**: Track reuse of templates/causal logic across unrelated crises.
- **Inputs**: Frame-invariant signatures, topic tags, moral vocabulary embeddings.
- **Logic**:
  - Build graph of infrastructure IDs linked to topic clusters.
  - Score reuse based on semantic overlap across crises.
- **Output**: `Alert { type: 'InfrastructureReuse', confidence: 0.87, infrastructure: [...] }`
- **Failure Modes**: Broad ideological overlap; mitigated by activation thresholds.

### D. Activation Threshold Scorer

- **Goal**: Predict when a narrative becomes actionable.
- **Inputs**: Mid-credibility repetition, cross-community uptake, behavioral signals.
- **Logic**:
  - Weight mid-credibility sources higher than high-visibility amplifiers.
  - Promote to `Activated` when follow-through signals exceed threshold.
- **Output**: `Signal { narrativeId, activationState, activationScore }`
- **Failure Modes**: Sparse ground truth; outcome logging is intentionally constrained pending validation.

### E. Engineer vs. Carrier Role Classifier

- **Goal**: Distinguish narrative engineers from carriers.
- **Inputs**: Cross-topic consistency, adaptation velocity, content origination traces.
- **Logic**:
  - Low volume + high consistency → Engineer.
  - High volume + low adaptation → Carrier.
- **Output**: `RoleAttribution { actorId, role, confidence }`
- **Failure Modes**: Missing provenance; deferred pending provenance ledger integration.

## 4. Executive & Market Positioning Extract (Internal Memo)

**To:** Leadership Team
**From:** Jules (Research & Product Engineering)
**Date:** 2026-02-08
**Subject:** Frame-Level Coordination, Latency Activation, and Epistemic Fatigue Signals

**Summary**
Influence operations are moving from persuasion to **epistemic fatigue**, delaying amplification until external triggers, and reusing **narrative infrastructure** across crises. Frame-invariant detection and activation thresholds now outperform topic-centric monitoring for early warning and response prioritization.

**Differentiation**
Summit can lead with **frame-invariant signatures**, **latency activation detectors**, and **role-based actor prioritization** to surface strategic coordinators before amplification peaks. This aligns with governance mandates and keeps detection anchored to defensible infrastructure reuse signals.

**Strategic Implication**
We will elevate infrastructure reuse, activation thresholds, and epistemic fatigue indices as first-class analytics. Delivery is deferred pending the Summit Readiness Assertion.

**Recommendation**
Ship the infrastructure reuse graph and activation threshold scorer as a paired release, with provenance logging enabled from day one and guardrails applied at ingestion.
