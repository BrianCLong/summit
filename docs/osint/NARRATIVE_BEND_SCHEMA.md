Owner: @intelgraph/osint-team
Last-Reviewed: 2026-01-29
Evidence-IDs: none
Status: active
ILSA-Level: 3
IBOM-Verified: true

# Narrative Engine Schema: BEND & Domains

**Status:** Active Standard
**Owner:** OSINT / Content Analysis
**Source:** Narrative Analysis (2026-01-22)
**Implementation:** `packages/narrative-engine`

## 1. Overview
To support Cross-Domain correlation and Market Warfare detection, the Narrative Engine must adopt the **BEND Framework** for framing analysis and expand its Domain ontology to include Economic and Market sectors.

## 2. Type Definitions

### 2.1 Narrative Framing (BEND)
```typescript
export type FramingType =
  | 'Backing'      // Supporting the narrative
  | 'Explanation'  // Providing context/details
  | 'Negation'     // Contradicting without evidence
  | 'Denial'       // Rejecting validity
  | 'Distortion';  // Misleading alteration
```

### 2.2 Domain Context
```typescript
export type NarrativeDomain = 'Political' | 'Social' | 'Economic' | 'Military' | 'Cyber';

export interface NarrativeContext {
  domain: NarrativeDomain;
  marketSectors?: string[]; // e.g., "Critical Minerals", "Energy"
  framing: FramingType;
}
```

## 3. Ontology Updates (Graph Schema)

### 3.1 Node: `Narrative`
*   `framingType`: (Enum: `FramingType`) - The primary rhetorical strategy.
*   `domain`: (Enum: `NarrativeDomain`) - The operational theater.
*   `syntheticScore`: (Float 0.0-1.0) - Probability of AI generation.

### 3.2 Relationship: `AMPLIFIES`
*   `isAutomated`: (Boolean) - Derived from Velocity checks.
*   `coordinationScore`: (Float) - Derived from network density.

## 4. Detection Logic
*   **Synthetic Amplification:** Defined as `Velocity > Threshold` AND `SemanticVariance < Threshold`.
*   **BEND Classification:** LLM-based categorization of narrative steps.
