# OSINT Methodology V2: Adaptive Sensing & Evidence-First Governance

> **Status:** ADOPTED
> **Owner:** Jules (Chief Architect)
> **Effective Date:** 2026-01-27
> **Based On:** Automation Turn #6 - Daily OSINT Methodology Update

## 1. Signal Extraction & Summit Operationalization

We have extracted the following high-value methodological signals and mapped them to Summit capabilities.

| Methodology Signal | Summit Primitive | Implementation Path |
| :--- | :--- | :--- |
| **Access-Friction Telemetry** | `CollectorHealth` | Instrument `osint-collector` to log latency/429s as "Friction" signals, not just errors. |
| **Narrative-Triggered Capture** | `NarrativeEngine` | Shift from keyword-based triggers to semantic frame triggers in `PlannerOrchestrator`. |
| **Selective Deep Capture** | `TaskDelta` | Use Resource-Aware Merging (RAM) to escalate to "Deep Capture" tasks only on anomaly detection. |
| **Cross-Collector Corroboration** | `Source.corroboration_status` | Enforce distinct `origin` checks in `OsintQualityGate`. |
| **Language-Shift Detection** | `RiskAssessment` | Add linguistic drift analysis to risk scoring models. |
| **Confidence Floors** | `RiskAssessment.confidence_min` | Hard-block assessments that violate minimum uncertainty bounds. |
| **Evidence-First Outputs** | `EvidenceBundle` (UEF) | Collectors must emit UEF-compliant bundles, not raw text or summaries. |
| **Decision-Latency Buffers** | `IntentRouterService` | Intentionally queue high-stakes decisions for a "cooling off" corroboration window. |
| **Separation of Sensing/Reasoning** | `AGENTS.md` | Bifurcate agent roles: "Sensing Agents" (dumb, fast) vs "Reasoning Agents" (smart, slow). |

## 2. Architecture & Data Model Impact

### A. Access Friction Telemetry Schema
*Location: `packages/osint-collector/src/types/telemetry.ts`*

To treat "access denial" as intelligence signal rather than operational failure:

```typescript
export interface AccessFriction {
  sourceId: string;
  frictionLevel: 'none' | 'low' | 'medium' | 'high' | 'blocked';
  indicators: {
    captchaPresented: boolean;
    rateLimitTightening: boolean;
    domObfuscationDetected: boolean;
    uiDarkPatterns: boolean;
  };
  latencyDelta: number; // ms change from baseline
  timestamp: string;
}
```

### B. Evidence Bundle Schema (UEF Extension)
*Location: `packages/osint-collector/src/types/evidence.ts`*

To ensure all outputs are audit-grade artifacts:

```typescript
export interface EvidenceBundle {
  id: string;
  primaryArtifact: unknown; // The raw capture
  provenance: {
    collectorId: string;
    timestamp: string;
    method: 'api' | 'scrape' | 'archive';
    sourceHash: string;
  };
  corroboration: {
    independentSources: number; // Count of distinct origins confirming this
    crossValidationId?: string; // Link to separate validation run
  };
  uncertainty: {
    confidence: number; // 0.0 - 1.0
    lowerBound: number;
    upperBound: number;
    notes: string;
  };
}
```

### C. Risk Assessment Model Updates
*Location: `intelgraph/core/models.py`*

```python
class RiskAssessmentBase(SQLModel):
    # ... existing fields
    confidence_min: float = Field(default=0.0, description="Minimum confidence floor required")
    uncertainty_range: float = Field(default=1.0, description="Width of uncertainty interval")
```

## 3. CI / Governance Enforcement

### New Gate: `OsintQualityGate`
*Location: `server/src/governance/OsintQualityGate.ts`*

**Enforcement Rules:**
1.  **Confidence Floor:** If `RiskScore > 0.8` (High), then `UncertaintyRange` must be `< 0.2`. High risk requires high precision.
2.  **Independence Check:** A "Corroborated" status requires at least 2 sources with distinct `origin` domains/IPs.
3.  **Opacity Debt Limit:** Reject ML-based assessments that lack a corresponding explanation record (XAI).

## 4. Agentization Updates (`AGENTS.md`)

**New Mandate: "Separation of Sensing & Reasoning"**
*   **Sensing Agents (Collectors):** Run continuously. Output *observations* only. Forbidden from making judgements.
*   **Reasoning Agents (Analysts):** Run sparingly. Consume observations. Output *judgements*.
*   **Rule:** "Output evidence, not stories." Narratives are downstream constructs; agents must produce verifiable data points first.

## 5. Technical Moat: Why Summit Wins

Summit differentiates by operationalizing **"Defensible Restraint"**:

1.  **Anti-Fragile Collection:** While others break when platforms add friction, Summit treats friction as a signal of platform sensitivity.
2.  **Synthetic Consensus Immunity:** By enforcing `validateIndependence()` at the governance layer, we prevent "bot swarm" validation loops.
3.  **Audit-Grade Intelligence:** Every output is an `EvidenceBundle` with cryptographic provenance (UEF), making our intelligence admissible in high-stakes contexts where raw "AI summaries" are rejected.
4.  **Safety-Critical Patterning:** We use "Decision Buffers" and "Kill Switches" borrowed from industrial control systems, preventing the runaway automation failures common in legacy OSINT tools.

---
**Implementation Status:**
- Specs: [x] Defined
- Schemas: [ ] Pending Implementation
- Models: [ ] Pending Implementation
- Gates: [ ] Pending Implementation
