# Governance Integration Points

> Where to add authority checks, PII detection, and provenance capture across Summit APIs, Copilot, and data flows.

## Overview

This document identifies the specific files and code locations where governance controls should be integrated. These integration points ensure that authority/license enforcement, PII detection, and provenance capture are applied consistently across the platform.

---

## 1. API Gateway Layer

### 1.1 GraphQL Authentication Directive

**File:** `server/src/graphql/authDirective.ts`

**Current State:** Basic JWT validation and role checking

**Integration Points:**
```typescript
// Add authority compiler evaluation
import { PolicyEvaluator } from '@summit/authority-compiler';

// Before resolver execution:
const decision = await evaluator.evaluate({
  user: context.user,
  operation: getOperationFromResolver(info),
  resource: { entityType: info.returnType.name },
  request: { timestamp: new Date(), ip: context.req.ip }
});

if (!decision.allowed) {
  throw new ForbiddenError(decision.reason, { auditId: decision.auditId });
}
```

**Priority:** P0 - Critical path for all authenticated operations

### 1.2 Budget Directive

**File:** `server/src/graphql/directives/budgetDirective.ts`

**Current State:** Query cost calculation and limits

**Integration Points:**
- Add tenant-specific budget tracking
- Integrate with cost guard service
- Add provenance for budget consumption events

**Priority:** P1

### 1.3 DLP Plugin

**File:** `server/src/graphql/plugins/dlpPlugin.ts`

**Current State:** Basic SSN pattern detection

**Integration Points:**
```typescript
// Enhance PII detection patterns
const PII_PATTERNS = {
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/,
  CREDIT_CARD: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  PHONE: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/,
  // Add more patterns...
};

// Add redaction based on user clearance
if (decision.redactedFields?.includes(fieldName)) {
  return '[REDACTED]';
}
```

**Priority:** P0 - Required for compliance

### 1.4 Audit Logger Plugin

**File:** `server/src/graphql/plugins/auditLogger.ts`

**Current State:** Basic audit logging

**Integration Points:**
```typescript
// Link audit logs to provenance ledger
import { recordStep } from '@summit/prov-ledger';

// After operation completion:
await recordStep({
  operationType: info.operation.operation,
  operationName: info.operation.name?.value,
  userId: context.user.id,
  tenantId: context.user.tenantId,
  entityIds: extractEntityIds(result),
  authorityId: context.policyDecision?.authorityId,
  auditId: context.policyDecision?.auditId,
});
```

**Priority:** P0 - Required for provenance chain

### 1.5 OTEL Plugin

**File:** `server/src/graphql/middleware/otelPlugin.ts`

**Current State:** Basic tracing

**Integration Points:**
- Add policy decision attributes to spans
- Track PII detection events
- Add provenance step IDs to traces

**Priority:** P1

---

## 2. AI Copilot Layer

### 2.1 Copilot Service

**File:** `services/ai-copilot/src/main.py`

**Current State:** NL→Cypher with basic policy checks (delete/export/PII)

**Integration Points:**

```python
# Add authority evaluation for copilot queries
from authority_compiler import evaluate_policy

@app.post("/query")
async def copilot_query(request: QueryRequest, user: User = Depends(get_current_user)):
    # Evaluate authority before processing
    decision = await evaluate_policy(
        user=user,
        operation="COPILOT",
        resource={"investigationId": request.investigation_id},
    )

    if not decision.allowed:
        raise HTTPException(403, detail=decision.reason)

    # Add provenance tracking
    step_id = await prov_ledger.start_step(
        type="copilot_query",
        user_id=user.id,
        input_hash=hash_input(request.query),
    )

    try:
        # Process query with citation tracking
        result = await process_query(request.query)

        # Record provenance with citations
        await prov_ledger.complete_step(
            step_id=step_id,
            output_hash=hash_output(result),
            citations=result.citations,
        )

        return result
    except Exception as e:
        await prov_ledger.fail_step(step_id, str(e))
        raise
```

**Priority:** P0 - Critical for glass-box copilot

### 2.2 RAG Service

**File:** `services/rag/src/main.py`

**Current State:** ChromaDB vector search with citations

**Integration Points:**

```python
# Add authority filtering to vector search
async def search_with_authority(query: str, user: User, k: int = 10):
    # Get user's accessible compartments
    accessible_compartments = await get_user_compartments(user)

    # Build filter for vector search
    filter_dict = {
        "$and": [
            {"tenant_id": user.tenant_id},
            {"compartments": {"$in": accessible_compartments}},
        ]
    }

    # Search with authority filter
    results = collection.query(
        query_texts=[query],
        n_results=k,
        where=filter_dict,
    )

    # Track document access for provenance
    for doc in results:
        await audit_document_access(doc.id, user.id, "rag_search")

    return results
```

**Priority:** P0 - Required for compartmented access

---

## 3. Data Ingestion Layer

### 3.1 Ingest Service

**File:** `services/ingest/src/sdk/ConnectorSDK.ts`

**Current State:** Transform/validate/enrich pipeline

**Integration Points:**

```typescript
// Add PII detection during ingestion
async transform(entity: ConnectorEntity): Promise<TransformedEntity> {
  const transformed = await this.applyMapping(entity);

  // Scan for PII
  const piiDetection = await this.detectPII(transformed);
  if (piiDetection.hasPII) {
    // Apply default classification
    transformed.classification = 'CUI';
    transformed.piiFields = piiDetection.fields;

    // Log PII detection
    await this.context.logger.warn('PII detected during ingestion', {
      entityType: entity.type,
      piiFields: piiDetection.fields,
    });
  }

  // Add provenance
  transformed.sources = [{
    sourceId: this.manifest.id,
    sourceRecordId: entity.externalId,
    sourceType: 'connector',
    ingestedAt: new Date(),
    sourceHash: hashEntity(entity),
  }];

  return transformed;
}
```

**Priority:** P0 - First line of defense for data quality

### 3.2 Feed Processor

**File:** `services/feed-processor/src/`

**Integration Points:**
- Add license validation for external feeds
- Track data lineage from feed to entities
- Validate source credibility

**Priority:** P1

---

## 4. Entity Resolution Layer

### 4.1 ER Service

**File:** `services/er/`

**Integration Points:**

```typescript
// Track entity resolution decisions in provenance
async resolveEntities(candidates: Entity[]): Promise<ResolvedEntity[]> {
  const resolutions: Resolution[] = [];

  for (const candidate of candidates) {
    const matches = await this.findMatches(candidate);
    const resolution = await this.selectBestMatch(candidate, matches);

    // Record resolution decision
    await this.provLedger.recordStep({
      type: 'entity_resolution',
      inputHash: hashEntity(candidate),
      outputHash: resolution.canonicalId,
      confidence: resolution.confidence,
      matchScores: matches.map(m => ({ id: m.id, score: m.score })),
    });

    resolutions.push(resolution);
  }

  return resolutions;
}
```

**Priority:** P1 - Important for identity management

---

## 5. Graph Query Layer

### 5.1 GraphRAG Resolvers

**File:** `server/src/graphql/resolvers/graphragResolvers.ts`

**Current State:** Graph traversal with citations

**Integration Points:**

```typescript
// Add bitemporal filtering
async graphRagAnswer(input: GraphRAGQueryInput, context: Context) {
  // Apply temporal filter if specified
  const temporalFilter = input.asOfDate
    ? `WHERE e.validFrom <= $asOfDate AND (e.validTo IS NULL OR e.validTo > $asOfDate)`
    : '';

  // Apply authority filter
  const authorityFilter = await buildAuthorityFilter(context.user);

  // Execute query with filters
  const paths = await this.neo4j.query(`
    MATCH path = (start)-[*1..${input.maxHops}]-(end)
    WHERE start.id IN $focusEntityIds
    ${temporalFilter}
    ${authorityFilter}
    RETURN path
  `, { focusEntityIds: input.focusEntityIds, asOfDate: input.asOfDate });

  // Generate answer with provenance
  const answer = await this.generateAnswer(paths, input.question);

  // Record query in provenance
  await this.provLedger.recordStep({
    type: 'graph_rag_query',
    question: input.question,
    pathCount: paths.length,
    citations: answer.citations,
  });

  return answer;
}
```

**Priority:** P0 - Core query functionality

---

## 6. Export Layer

### 6.1 Disclosure Packager

**Files:** `services/` + `docs/disclosure-packager-*.md`

**Integration Points:**

```typescript
// Generate verifiable export manifests
async createExportPackage(request: ExportRequest): Promise<ExportPackage> {
  // Check export authority
  const decision = await this.authorityCompiler.evaluate({
    user: request.user,
    operation: 'EXPORT',
    resource: {
      entityIds: request.entityIds,
      investigationId: request.investigationId,
    },
  });

  if (!decision.allowed) {
    throw new ForbiddenError(decision.reason);
  }

  // Check for two-person control requirement
  if (decision.requiresTwoPersonControl) {
    await this.requireApproval(request, decision.twoPersonControlId);
  }

  // Build export with provenance manifest
  const exportData = await this.gatherExportData(request);
  const manifest = await this.provLedger.generateManifest({
    exportId: request.id,
    entityIds: request.entityIds,
    exportedBy: request.user.id,
    exportedAt: new Date(),
    authorityId: decision.authorityId,
  });

  // Sign manifest
  const signedManifest = await this.jws.sign(manifest);

  return {
    data: exportData,
    manifest: signedManifest,
    hashTree: await this.buildMerkleTree(exportData),
  };
}
```

**Priority:** P0 - Required for chain-of-custody

---

## 7. Integration Checklist

### Phase 1 (Wave 0-1)

- [ ] `authDirective.ts` - Authority compiler integration
- [ ] `dlpPlugin.ts` - Enhanced PII detection
- [ ] `auditLogger.ts` - Provenance linkage
- [ ] `ai-copilot/main.py` - Citation + provenance
- [ ] `rag/main.py` - Authority filtering
- [ ] `ConnectorSDK.ts` - PII detection + provenance

### Phase 2 (Wave 1-2)

- [ ] `graphragResolvers.ts` - Bitemporal queries
- [ ] `er/` - Resolution provenance
- [ ] Disclosure packager - Export manifests
- [ ] `feed-processor/` - License validation

### Phase 3 (Wave 2-3)

- [ ] `otelPlugin.ts` - Policy decision spans
- [ ] `budgetDirective.ts` - Tenant cost tracking
- [ ] Model governance hooks
- [ ] Two-person control workflows

---

## 8. Testing Strategy

### Unit Tests
- Mock policy evaluator for each integration point
- Test PII detection patterns
- Verify provenance step recording

### Integration Tests
- End-to-end policy enforcement
- Cross-service provenance chain
- Export manifest verification

### Security Tests
- Authority bypass attempts
- PII leak detection
- Compartment isolation verification

---

## Related Documents

- [Authority Compiler Package](../packages/authority-compiler/)
- [Provenance Ledger](../packages/prov-ledger/)
- [Strategic Implementation Roadmap](./STRATEGIC_IMPLEMENTATION_ROADMAP.md)
