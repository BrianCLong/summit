# Citation Gate - Evidence-First Enforcement

The Citation Gate ensures every generated claim in GraphRAG and publish/export flows is backed by resolvable evidence.

## When it is active

- Disabled by default.
- Set `CITATION_GATE=1` in the environment to enforce blocking behavior.

## Citation model

```ts
type Citation = {
  evidenceId: string;
  claimId?: string;
  snippet?: string;
  snippetHash?: string;
  source?: string;
  observedAt?: string;
  redactionApplied?: boolean;
};
```

Hashes are derived automatically from snippets when provided so downstream systems can verify provenance.

## Request flow (GraphRAG endpoints)

1. GraphRAG retrieves context and evidence for the case.
2. The LLM is instructed to emit citations for every factual claim.
3. `citation-gate` validates the citations against the evidence in-context:
   - Missing citations → `citationDiagnostics.missingCitations` added and answer falls back to a safe message when the gate is enabled.
   - Dangling citations (IDs not in context) → `citationDiagnostics.danglingCitations` added.
4. Responses include `citationDiagnostics` so clients can surface actionable guidance.
5. When `CITATION_GATE=1`, the `/graphrag/answer` route returns HTTP 422 whenever diagnostics are present.

## Publish / export flows

- `ReportServiceV2` calls `assertPublishReadyCitations`, which throws a `CitationValidationError` if:
  - No citations are provided, or
  - Citations cannot be resolved to evidence IDs/snippets.
- This hard-fails publish/export requests when `CITATION_GATE=1`.

## Diagnostics contract

- `citationDiagnostics.missingCitations` lists missing claim identifiers (if known) with a human-readable message.
- `citationDiagnostics.danglingCitations` lists unresolved evidence IDs so callers can reload or refresh context.

## Testing

- Unit tests: `server/src/services/graphrag/__tests__/citation-gate.test.ts`
- Integration tests: `server/src/tests/graphrag/citation-gate.integration.test.ts`
- Reporting/publish enforcement: `server/src/services/reporting/__tests__/ReportServiceV2.test.ts`
