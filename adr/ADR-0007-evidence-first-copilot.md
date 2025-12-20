# ADR-0007: Evidence-First AI Copilot with Citations

## Status
Accepted

## Date
2025-11-21

## Context

Summit's AI Copilot must meet Council Wishbook requirements for:

1. **Explainability** - Users must understand why the AI gave a particular answer
2. **Traceability** - Every assertion must link to source evidence
3. **Accountability** - AI operations must be auditable
4. **Safety** - Prevent harmful or policy-violating outputs
5. **Cost Control** - Track and limit AI usage costs

Current copilot implementation lacks comprehensive citation tracking and glass-box execution logs.

## Decision

We will implement an **Evidence-First Copilot** that:

### Citation Requirements
- Every factual claim includes inline citations
- Citations link to source entities/documents
- Confidence scores for each citation
- Coverage metrics (% of claims with citations)

### Glass-Box Execution
- Log every step of query processing
- Record input/output hashes for integrity
- Track model, parameters, and token usage
- Enable replay for debugging

### Safety Harness
- Pre-query validation (blocked keywords, patterns)
- PII detection and scrubbing
- Policy violation detection
- Cost guardrails per user/tenant

### Provenance Chain
- Link copilot responses to prov-ledger
- Track AI model attribution
- Record human feedback
- Support retraction/correction

## Implementation

### Response Format
```typescript
interface CopilotResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  citationCoverage: number; // % of claims with citations
  provenance: {
    stepId: string;
    modelId: string;
    inputHash: string;
    outputHash: string;
  };
}

interface Citation {
  entityId: string;
  entityType: string;
  position: { start: number; end: number };
  supportingText: string;
  relevance: number;
  confidence: number;
}
```

### Hook Chain
```typescript
const copilotHooks = composeCopilotHooks(
  createQueryValidationHook(validationConfig),
  createPIIScrubbingHook(piiConfig),
  createCostControlHook(costConfig),
  createCitationEnforcementHook(citationConfig),
  createCopilotProvenanceHook(provenanceRecorder),
);
```

## Consequences

### Positive
- Trustworthy AI outputs with evidence
- Auditable AI operations
- Cost visibility and control
- Safety guardrails prevent harm
- Supports human oversight

### Negative
- Increased latency for citation generation
- Higher token usage for evidence retrieval
- Complexity in citation quality assessment
- May refuse queries with insufficient evidence

### Mitigations
- Async citation enrichment where possible
- Cache frequently-cited entities
- Graceful degradation with warnings
- Clear messaging when evidence is limited

## Success Metrics
- Citation coverage ≥ 90% of factual claims
- Citation confidence ≥ 0.7 average
- Response latency < 5s for simple queries
- Zero policy violations in production

## Related
- [Governance Hooks Package](/packages/governance-hooks/)
- [Citation Tracker](/packages/prov-ledger-extensions/src/citation-tracker.ts)
- [AI Attribution](/packages/prov-ledger-extensions/src/ai-attribution.ts)
