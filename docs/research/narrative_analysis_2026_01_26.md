# Narrative Analysis & Information Operations Research Update (2026-01-26)

## 1. Structured Extraction Table

| Insight Source                              | Research Finding                                                                                                                              | Summit Component                                       | Action Item                                                                                            |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **arXiv** (DISARM Agentic Pipeline)         | Agent-based automation can map manipulative behaviors to DISARM taxonomies at scale, improving interoperability across analytic environments. | `InfluenceDetectionService` / `NarrativeEngine`        | Add DISARM-aligned event mapping and multi-agent labeling pipeline for coordinated behavior detection. |
| **The Guardian** (AI Bot Swarms)            | Coordinated AI bot swarms can fabricate consensus through adaptive, collective behavior; single-post moderation is insufficient.              | `CoordinationDetector` / `BehavioralAnomalyService`    | Prioritize swarm-level behavioral anomaly detection and coordination graph scoring.                    |
| **Thomson Foundation** (Sudan Conflict)     | Disinformation in conflict zones shapes humanitarian outcomes; context-aware narrative and actor mapping outperforms volume metrics.          | `NarrativeContextService` / `ConflictSignalEnrichment` | Add conflict-context tags and narrative-actor fusion for humanitarian impact assessment.               |
| **EU DisinfoLab** (Policy Updates)          | EU policy actions are scaling enforcement and resilience measures, reinforcing media literacy and compliance obligations.                     | `PolicyEngine` / `ComplianceSignals`                   | Track regulatory actions as policy-as-code signals; wire to response playbooks.                        |
| **Misinformation Review** (Systemic Risk)   | Misinformation is an informational systemic risk with cascading social effects beyond content falsity.                                        | `RiskModel` / `ImpactGraph`                            | Extend risk scoring to include downstream institutional impact indicators.                             |
| **OUP Academic** (Deterrence & Attribution) | Attribution decisions are political and shaped by domestic costs; timing and transparency are strategic levers.                               | `AttributionWorkflow` / `DecisionLog`                  | Add attribution-decision rationale logging and timing guardrails for public releases.                  |

## 2. Proposed Schema / Model Deltas

### DISARM Event Mapping (`packages/influence-ops/src/disarm/types.ts`)

**New Enums & Interfaces:**

```typescript
export type DisarmPhase =
  | "Plan"
  | "Prepare"
  | "Produce"
  | "Publish"
  | "Amplify"
  | "Engage"
  | "Persist"
  | "Conceal";

export type DisarmTactic =
  | "Deception"
  | "CoordinatedAmplification"
  | "NarrativeSeeding"
  | "PersonaNetwork"
  | "HashtagHijack"
  | "Harassment";

export interface DisarmMapping {
  phase: DisarmPhase;
  tactic: DisarmTactic;
  techniqueId?: string;
  confidence: number;
  evidenceIds: string[];
}

export interface InfluenceEvent {
  id: string;
  summary: string;
  disarm?: DisarmMapping;
  coordinationScore?: number;
  systemicRiskScore?: number;
}
```

### Coordination & Systemic Risk (`server/src/analytics/coordination/types.ts`)

- **Node**: `CoordinationCluster`
  - Property: `swarmSignature` (String)
  - Property: `adaptationRate` (Float)
  - Property: `behavioralDiversity` (Float)
- **Relationship**: `COORDINATES_WITH`
  - Property: `latencyMs` (Integer)
  - Property: `synchronyScore` (Float)
- **Node**: `SystemicImpact`
  - Property: `institutionalImpact` (Float)
  - Property: `humanitarianRisk` (Float)
  - Property: `policyExposure` (Float)

## 3. Detection Module Specs

### A. Swarm Coordination Scanner

- **Goal**: Detect agentic bot swarms by identifying synchronized behavior across accounts.
- **Inputs**: Account activity streams, interaction graphs, content embeddings.
- **Logic**:
  - Build temporal interaction graphs in rolling windows.
  - Compute `synchronyScore` for shared content bursts and co-engagement timing.
  - Flag clusters with high synchrony + low behavioral diversity as swarm candidates.
- **Output**: `Alert { type: 'SwarmCoordination', confidence: 0.85, clusters: [...] }`
- **Failure Modes**: Viral grassroots mobilization; mitigate with provenance and account-age signals.

### B. DISARM Mapping Agent

- **Goal**: Automatically map observed behaviors to DISARM phases and tactics.
- **Inputs**: Candidate events + evidence bundles.
- **Logic**:
  - Multi-agent classifier ensemble produces phase/tactic votes.
  - Require consensus threshold; otherwise mark as `Intentionally constrained`.
- **Output**: `DisarmMapping { phase, tactic, confidence, evidenceIds }`
- **Failure Modes**: Sparse evidence or ambiguous intent; trigger analyst review.

### C. Systemic Risk Impact Scorer

- **Goal**: Quantify cascading societal impacts of disinformation beyond content-level signals.
- **Inputs**: Narrative propagation metrics, institutional dependency graph, policy exposure tags.
- **Logic**:
  - Derive `institutionalImpact` via dependency-weighted diffusion.
  - Estimate `humanitarianRisk` using conflict-context weights.
- **Output**: `RiskAssessment { systemicRiskScore, policyExposure }`

## 4. Executive & Market Positioning Extract (Internal Memo)

**To:** Leadership Team
**From:** Jules (Research & Product Engineering)
**Date:** 2026-01-26
**Subject:** Swarm-Scale IO Detection and Systemic Risk Readiness

**Summary**
Recent research underscores a shift from isolated content moderation to **coordination-level detection** and **systemic risk modeling**. The DISARM agentic pipeline demonstrates that taxonomy-aligned automation is now feasible at operational scale, while policy trends and conflict-zone analyses require context-rich risk scoring.

**Differentiation**
Summit will lead with **swarm scanners** (behavioral synchrony + adaptation signals), **DISARM-aligned mappings**, and **systemic impact scoring** that capture downstream social effects. This aligns with EU policy direction and provides defensible attribution and mitigation workflows.

**Strategic Implication**
We will prioritize multi-agent DISARM mapping and coordination detection as first-class analytics, enabling cross-platform comparability and measurable resilience outcomes. Delivery is deferred pending alignment with the Summit Readiness Assertion.

**Recommendation**
Ship the coordination scanner and DISARM mapper as a joint initiative in the next sprint, with governance logging enabled from day one.
