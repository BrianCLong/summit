---
id: XAI-001
name: XAI Integrity Overlays & Dissent Capture
slug: xai-integrity-overlays
category: security
subcategory: explainability
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Builds an explainability overlay that attaches path rationales, counterfactuals,
  feature importance, and integrity flags to analytical results. Requires dissent
  notes before publication.

objective: |
  Ensure analytical transparency and capture dissenting opinions for audit trails.

tags:
  - explainability
  - xai
  - transparency
  - dissent
  - integrity
  - counterfactuals

dependencies:
  services:
    - neo4j
    - postgresql
  packages:
    - "@intelgraph/graph"
    - "@intelgraph/prov-ledger"
    - "@intelgraph/audit"

deliverables:
  - type: package
    description: XAI overlay library
  - type: service
    description: Dissent capture service
  - type: tests
    description: Explainability verification suite
  - type: documentation
    description: XAI integration guide

acceptance_criteria:
  - description: Explanations generated for all analytical results
    validation: Query result, verify explanation attached
  - description: Counterfactuals computed correctly
    validation: Check counterfactual logic
  - description: Dissent required before publication
    validation: Attempt publish without dissent, verify blocked
  - description: Integrity flags shown to users
    validation: Review UI shows missing evidence warnings

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - SEC-001
  - SEC-002
  - DQ-001

blueprint_path: ../blueprints/templates/service
---

# XAI Integrity Overlays & Dissent Capture

## Objective

Build explainability infrastructure that makes analytical reasoning transparent, exposes limitations and uncertainties, and captures dissenting opinions for audit trails. All analytical results must include explanations before publication.

## Prompt

**Build an explainability overlay that attaches path rationales, counterfactuals, feature importance, and integrity flags (missing evidence, contradiction graphs, confidence bands) to each analytical result. Require dissent notes before publication; store in an immutable audit.**

### Core Requirements

**(a) Path Rationales**

Explain graph traversals and reasoning paths:

```typescript
interface PathRationale {
  query: string;  // Original Cypher query
  resultEntity: Entity;
  reasoningPath: ReasoningStep[];
  confidence: number;  // 0-1
  evidenceQuality: EvidenceQuality;
}

interface ReasoningStep {
  stepNumber: number;
  description: string;
  cypher: string;  // Cypher fragment
  intermediateResult: any;
  confidence: number;
}

interface EvidenceQuality {
  completeness: number;  // % of expected evidence present
  corroboration: number;  // % corroborated by independent sources
  recency: number;  // Average age of evidence (days)
}

// Example: "Who is connected to Entity X?"
const rationale: PathRationale = {
  query: "MATCH (x:Entity {id: 'e-123'})-[r]-(connected) RETURN connected",
  resultEntity: { id: 'e-456', name: 'Connected Entity' },
  reasoningPath: [
    {
      stepNumber: 1,
      description: "Found direct relationship ASSOCIATED_WITH",
      cypher: "MATCH (x:Entity {id: 'e-123'})-[r:ASSOCIATED_WITH]-(connected)",
      intermediateResult: { relationshipId: 'r-789' },
      confidence: 0.85
    },
    {
      stepNumber: 2,
      description: "Verified relationship via 2 independent sources",
      cypher: "MATCH (r:Relationship {id: 'r-789'})-[:DERIVED_FROM]-(source)",
      intermediateResult: { sources: ['source-1', 'source-2'] },
      confidence: 0.92
    }
  ],
  confidence: 0.85 * 0.92,  // Combined confidence
  evidenceQuality: {
    completeness: 0.80,  // 80% of expected evidence present
    corroboration: 1.0,  // Fully corroborated
    recency: 15  // Average 15 days old
  }
};
```

**(b) Counterfactuals**

Show alternative conclusions if assumptions changed:

```typescript
interface Counterfactual {
  id: string;
  originalConclusion: Conclusion;
  alteredAssumption: Assumption;
  alternativeConclusion: Conclusion;
  likelihood: number;  // Probability this alternative is correct
}

interface Assumption {
  type: string;
  description: string;
  value: any;
}

interface Conclusion {
  statement: string;
  confidence: number;
  supportingEvidence: string[];
}

// Example
async function generateCounterfactuals(
  analysis: Analysis
): Promise<Counterfactual[]> {
  const counterfactuals: Counterfactual[] = [];

  // Original: "Entity X is located in Country A"
  const original: Conclusion = {
    statement: "Entity X is located in Country A",
    confidence: 0.75,
    supportingEvidence: ['source-1', 'source-2']
  };

  // Counterfactual 1: What if source-1 is unreliable?
  const cf1 = await recomputeWithout(analysis, 'source-1');
  counterfactuals.push({
    id: 'cf-001',
    originalConclusion: original,
    alteredAssumption: {
      type: 'source_reliability',
      description: "If source-1 is discarded due to credibility issues",
      value: { excludedSources: ['source-1'] }
    },
    alternativeConclusion: {
      statement: "Entity X location uncertain",
      confidence: 0.40,  // Lower confidence without source-1
      supportingEvidence: ['source-2']
    },
    likelihood: 0.20  // 20% chance source-1 is unreliable
  });

  // Counterfactual 2: What if relationship is misclassified?
  const cf2 = await recomputeWithDifferentRelType(analysis);
  counterfactuals.push({
    id: 'cf-002',
    originalConclusion: original,
    alteredAssumption: {
      type: 'relationship_type',
      description: "If relationship is 'PREVIOUSLY_LOCATED_IN' not 'LOCATED_IN'",
      value: { relationshipType: 'PREVIOUSLY_LOCATED_IN' }
    },
    alternativeConclusion: {
      statement: "Entity X was previously in Country A, current location unknown",
      confidence: 0.60,
      supportingEvidence: ['source-1', 'source-2']
    },
    likelihood: 0.15
  });

  return counterfactuals;
}
```

**(c) Feature Importance**

Rank factors contributing to conclusion:

```typescript
interface FeatureImportance {
  feature: string;
  importance: number;  // 0-1, sum to 1.0
  direction: 'positive' | 'negative';
  description: string;
}

// Example: "Why is Entity X classified as high-risk?"
const featureImportances: FeatureImportance[] = [
  {
    feature: 'connection_to_known_threats',
    importance: 0.45,
    direction: 'positive',
    description: 'Entity X has direct relationships to 3 known threat actors'
  },
  {
    feature: 'financial_transactions',
    importance: 0.30,
    direction: 'positive',
    description: 'Suspicious transaction patterns flagged by ML model'
  },
  {
    feature: 'geolocation_history',
    importance: 0.15,
    direction: 'positive',
    description: 'Recent travel to high-risk regions'
  },
  {
    feature: 'source_credibility',
    importance: 0.10,
    direction: 'negative',
    description: 'Primary source has moderate credibility (70/100)'
  }
];

// Use SHAP or LIME for ML models
async function explainMLPrediction(
  model: MLModel,
  input: any
): Promise<FeatureImportance[]> {
  const explainer = new SHAPExplainer(model);
  const shapValues = await explainer.explain(input);

  return Object.entries(shapValues).map(([feature, value]) => ({
    feature,
    importance: Math.abs(value),
    direction: value > 0 ? 'positive' : 'negative',
    description: `Contribution: ${value > 0 ? '+' : ''}${value.toFixed(3)}`
  }));
}
```

**(d) Integrity Flags**

Warn analysts of limitations:

```typescript
enum IntegrityFlag {
  MISSING_EVIDENCE = 'missing_evidence',
  CONTRADICTORY_EVIDENCE = 'contradictory_evidence',
  LOW_CONFIDENCE = 'low_confidence',
  SINGLE_SOURCE = 'single_source',
  STALE_DATA = 'stale_data',
  INCOMPLETE_PROVENANCE = 'incomplete_provenance',
  UNVERIFIED_SOURCE = 'unverified_source'
}

interface IntegrityWarning {
  flag: IntegrityFlag;
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEntities: string[];
  recommendation: string;
}

// Detect integrity issues
async function detectIntegrityIssues(
  result: AnalyticalResult
): Promise<IntegrityWarning[]> {
  const warnings: IntegrityWarning[] = [];

  // Check for missing evidence
  const expectedEvidence = await getExpectedEvidence(result);
  const actualEvidence = result.supportingEvidence;
  if (actualEvidence.length < expectedEvidence.length * 0.5) {
    warnings.push({
      flag: IntegrityFlag.MISSING_EVIDENCE,
      severity: 'high',
      message: `Only ${actualEvidence.length}/${expectedEvidence.length} expected evidence present`,
      affectedEntities: result.entities.map(e => e.id),
      recommendation: 'Seek additional sources before finalizing conclusion'
    });
  }

  // Check for contradictions
  const contradictions = await findContradictions(result.entities);
  if (contradictions.length > 0) {
    warnings.push({
      flag: IntegrityFlag.CONTRADICTORY_EVIDENCE,
      severity: 'high',
      message: `Found ${contradictions.length} contradictory statements`,
      affectedEntities: contradictions.map(c => c.entityId),
      recommendation: 'Reconcile contradictions or note in caveats'
    });
  }

  // Check confidence
  if (result.confidence < 0.5) {
    warnings.push({
      flag: IntegrityFlag.LOW_CONFIDENCE,
      severity: 'medium',
      message: `Conclusion has low confidence (${result.confidence.toFixed(2)})`,
      affectedEntities: result.entities.map(e => e.id),
      recommendation: 'Consider hedging language or gathering more evidence'
    });
  }

  // Check for single-source reliance
  const sources = new Set(result.supportingEvidence.map(e => e.sourceId));
  if (sources.size === 1) {
    warnings.push({
      flag: IntegrityFlag.SINGLE_SOURCE,
      severity: 'high',
      message: 'Conclusion relies on single source (no corroboration)',
      affectedEntities: result.entities.map(e => e.id),
      recommendation: 'Seek corroborating sources'
    });
  }

  return warnings;
}
```

**(e) Confidence Bands**

Show uncertainty ranges:

```typescript
interface ConfidenceBand {
  metric: string;
  pointEstimate: number;
  lowerBound: number;  // 95% CI
  upperBound: number;  // 95% CI
  distribution: 'normal' | 'beta' | 'empirical';
}

// Example: "Entity X connection strength"
const confidenceBand: ConfidenceBand = {
  metric: 'connection_strength',
  pointEstimate: 0.75,
  lowerBound: 0.65,
  upperBound: 0.85,
  distribution: 'beta'
};

// Visualize in UI
<ConfidenceBandChart data={confidenceBand} />
// Shows point estimate with shaded uncertainty region
```

**(f) Dissent Capture (Pre-Publication)**

Require analysts to document dissent:

```typescript
interface DissentNote {
  id: string;
  analysisId: string;
  analyst: User;
  timestamp: Date;
  dissentType: 'methodological' | 'evidentiary' | 'interpretive' | 'ethical';
  statement: string;
  supportingRationale: string;
  alternativeConclusion?: string;
}

interface PublicationGate {
  // Check if publication allowed
  canPublish(analysisId: string): Promise<PublicationCheck>;

  // Record dissent
  recordDissent(dissent: DissentNote): Promise<void>;

  // Require dissent documentation
  requireDissentReview(analysisId: string): Promise<boolean>;
}

// Before publishing report
async function publishReport(reportId: string): Promise<void> {
  const check = await publicationGate.canPublish(reportId);

  if (!check.allowed) {
    if (check.reason === 'dissent_not_addressed') {
      throw new Error(
        'Cannot publish: Dissenting opinion must be documented. ' +
        'Use the "Record Dissent" form to acknowledge disagreement.'
      );
    }
  }

  // Proceed with publication
  await reportService.publish(reportId);

  // Log to audit (including dissent if any)
  await auditService.log({
    event: 'report_published',
    reportId,
    dissents: await dissentService.getDissents(reportId)
  });
}

// Dissent UI
interface DissentFormProps {
  analysisId: string;
  onSubmit: (dissent: DissentNote) => void;
}

function DissentForm({ analysisId, onSubmit }: DissentFormProps) {
  return (
    <form>
      <h3>Record Dissenting Opinion</h3>
      <p>If you disagree with this analysis, document your dissent below:</p>

      <Select label="Dissent Type">
        <option value="methodological">Methodological (approach flawed)</option>
        <option value="evidentiary">Evidentiary (insufficient evidence)</option>
        <option value="interpretive">Interpretive (different conclusion)</option>
        <option value="ethical">Ethical (concerns about impact)</option>
      </Select>

      <TextArea label="Dissent Statement" required />
      <TextArea label="Supporting Rationale" required />
      <TextArea label="Alternative Conclusion (if any)" />

      <Button type="submit">Submit Dissent</Button>
    </form>
  );
}
```

**(g) Immutable Audit Storage**

Store dissents in append-only ledger:

```sql
CREATE TABLE dissent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  analyst_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  dissent_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  supporting_rationale TEXT NOT NULL,
  alternative_conclusion TEXT,
  hash TEXT NOT NULL,  -- SHA-256 of (analysis_id + analyst_id + statement)
  signature TEXT NOT NULL  -- Signed by analyst's key
);

-- Cannot update or delete (enforced by DB triggers)
CREATE OR REPLACE FUNCTION prevent_dissent_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Dissent ledger is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_dissent_update
BEFORE UPDATE OR DELETE ON dissent_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_dissent_modification();
```

### Deliverables Checklist

- [x] Path rationale generator
- [x] Counterfactual engine
- [x] Feature importance calculator (SHAP integration)
- [x] Integrity flag detector
- [x] Confidence band visualizations
- [x] Dissent capture service
- [x] Publication gate
- [x] Immutable dissent ledger
- [x] GraphQL API for explanations
- [x] React UI for dissent forms
- [x] XAI integration guide

### Acceptance Criteria

1. **Path Rationales**
   - [ ] Execute graph query
   - [ ] Verify rationale generated
   - [ ] Check reasoning steps documented

2. **Counterfactuals**
   - [ ] Generate counterfactuals for analysis
   - [ ] Verify alternative conclusions computed
   - [ ] Check likelihood scores present

3. **Integrity Flags**
   - [ ] Analyze result with missing evidence
   - [ ] Verify warning generated
   - [ ] Check recommendation shown to user

4. **Dissent Capture**
   - [ ] Attempt publish without dissent review
   - [ ] Verify blocked
   - [ ] Record dissent
   - [ ] Retry publish → succeeds

5. **Immutable Audit**
   - [ ] Record dissent
   - [ ] Attempt update dissent → blocked
   - [ ] Verify signature valid

## Implementation Notes

### SHAP Integration

For ML model explanations:
```bash
pip install shap
```

```python
import shap

# Create explainer
explainer = shap.TreeExplainer(model)

# Compute SHAP values
shap_values = explainer.shap_values(X_test)

# Visualize
shap.summary_plot(shap_values, X_test)
```

### UI Considerations

- Show explanations inline with results (collapsible)
- Use visual cues for integrity flags (⚠️ icons)
- Confidence bands as shaded regions on charts
- Dissent forms easy to access (button on every analysis)

### Performance

- Cache explanations (recompute only on data change)
- Async counterfactual generation (don't block UI)
- Batch feature importance calculations

## References

- [SHAP (SHapley Additive exPlanations)](https://github.com/slundberg/shap)
- [LIME](https://github.com/marcotcr/lime)
- [Explainable AI Guidelines](https://www.nist.gov/publications/explainable-artificial-intelligence-nist-ai-100-2-e2023)

## Related Prompts

- **SEC-001**: Model Abuse Watchtower (explain why prompt blocked)
- **SEC-002**: Counter-Deception Lab (explain credibility scores)
- **DQ-001**: Data Quality Dashboard (integrity flags as DQ dimension)
