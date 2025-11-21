# AI Copilot MVP - "Minimum Lovable" Implementation Guide

## Executive Summary

This document describes the implementation of Summit's AI Copilot MVP, designed to match the Wishbook's "Auditable by Design" requirements. The copilot enables intelligence analysts to query investigation graphs using natural language, with full transparency, cost awareness, and policy enforcement.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Analyst Workflow                            │
│  1. Ask question in natural language                            │
│  2. Preview generated Cypher + cost estimate                    │
│  3. Review safety checks and policy explanations                │
│  4. Approve and execute query                                   │
│  5. View results with citations and provenance                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CopilotSidebar.tsx (React)                    │
│  • Natural language input                                        │
│  • Cypher preview panel                                         │
│  • Cost/complexity indicators                                   │
│  • Results with entity citations                                │
│  • Hypothesis generator                                         │
│  • Narrative builder                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              GraphQL API (copilot-mvp.graphql)                  │
│  • previewNLQuery: Generate Cypher with cost estimate          │
│  • executeNLQuery: Run approved query with audit trail         │
│  • generateHypotheses: AI-powered investigation hypotheses     │
│  • generateNarrative: Build analytical reports                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             NLToCypherService.ts (Backend)                      │
│  1. Guardrails validation (prompt injection, PII)              │
│  2. Schema-aware LLM prompt generation                         │
│  3. Cypher generation with LLM                                 │
│  4. Query validation and safety checks                         │
│  5. Cost/complexity estimation                                 │
│  6. Sandbox execution with audit logging                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┬──────────────────┬─────────────────┬────────────┐
│  LLM         │  Neo4j Graph     │  Guardrails     │  Audit Log │
│  Service     │  Database        │  Service        │  Storage   │
└──────────────┴──────────────────┴─────────────────┴────────────┘
```

## Implementation Files

### Backend Services

#### 1. **NLToCypherService.ts** (`server/src/services/`)
Core service implementing natural language to Cypher translation.

**Key Methods:**
- `translateQuery(input)`: Convert NL to Cypher with safety checks
- `executeQuery(cypher, investigationId, auditId)`: Execute approved queries
- `validateAndEstimate(cypher)`: Validate syntax and estimate cost
- `generateCypherWithLLM(nl, schema, invId)`: LLM-powered generation

**Safety Features:**
- Blocks dangerous operations (DELETE, CREATE, DROP)
- Enforces investigationId filtering
- Complexity thresholds (max 10,000 rows)
- Guardrails integration for prompt injection

**Example Flow:**
```typescript
const service = getNLToCypherService(llm, guardrails, neo4j);

// Step 1: Preview
const preview = await service.translateQuery({
  query: "Show me all persons connected to financial entities",
  investigationId: "inv-123",
  userId: "analyst-456",
  dryRun: true
});

// Returns:
// {
//   cypher: "MATCH (p:Entity {investigationId: $investigationId, type: 'Person'})-[r]-(f:Entity {type: 'Financial'}) RETURN p, r, f LIMIT 100",
//   explanation: "Finds Person entities connected to Financial entities",
//   estimatedRows: 50,
//   estimatedCost: 1.0,
//   complexity: "low",
//   allowed: true,
//   auditId: "audit-789"
// }

// Step 2: Execute (after analyst approval)
if (preview.allowed) {
  const result = await service.executeQuery(
    preview.cypher,
    "inv-123",
    preview.auditId
  );
  // Returns records with execution metadata
}
```

#### 2. **GraphQL Schema** (`server/src/graphql/schema/copilot-mvp.graphql`)

**Queries:**
```graphql
# Preview query without executing
previewNLQuery(input: NLQueryInput!): CypherPreview!

# Execute natural language query
executeNLQuery(input: NLQueryInput!): CypherExecutionResult!

# Generate investigation hypotheses
generateHypotheses(input: HypothesisInput!): [Hypothesis!]!

# Build narrative report
generateNarrative(input: NarrativeInput!): Narrative!
```

**Types:**
```graphql
type CypherPreview {
  cypher: String!
  explanation: String!
  estimatedRows: Int!
  estimatedCost: Float!
  complexity: String!
  warnings: [String!]
  allowed: Boolean!
  blockReason: String      # Policy explanation when blocked
  auditId: ID
}

type CypherExecutionResult {
  records: [JSON!]!
  summary: ExecutionSummary!
  citations: [ID!]!        # Entity IDs involved in results
  auditId: ID
}
```

#### 3. **GraphQL Resolvers** (`server/src/graphql/resolvers.copilot-mvp.ts`)

Implements the GraphQL API endpoints, coordinating between:
- NLToCypherService for query translation
- GraphRAGService for hypothesis/narrative generation
- LLMGuardrails for security validation

### Frontend Components

#### 4. **CopilotSidebar.tsx** (`client/src/components/copilot/`)

React component implementing the analyst-facing UI.

**Features:**
- **Query Tab**: Natural language input with preview/execute flow
- **Hypotheses Tab**: AI-generated investigation hypotheses
- **Narrative Tab**: Automated report generation

**Key UI Elements:**

1. **Query Preview Panel:**
   - Plain English explanation
   - Estimated rows and cost chips
   - Complexity indicator (low/medium/high)
   - Expandable Cypher code viewer
   - Safety warnings

2. **Policy Block Display:**
   - Clear block reason
   - Specific policy violations
   - Audit trail ID
   - Red alert styling

3. **Results Display:**
   - Record count and execution time
   - Entity citation chips (clickable)
   - JSON record viewer
   - Audit trail reference

**Usage Example:**
```tsx
import CopilotSidebar from './components/copilot/CopilotSidebar';

function InvestigationView({ investigationId }) {
  return (
    <Box display="flex">
      <Box flexGrow={1}>
        {/* Main investigation view */}
      </Box>
      <Box width={400}>
        <CopilotSidebar
          investigationId={investigationId}
          userId={currentUser.id}
          onEntityClick={(entityId) => navigateToEntity(entityId)}
        />
      </Box>
    </Box>
  );
}
```

### Testing

#### 5. **Unit Tests** (`server/src/services/__tests__/NLToCypherService.test.ts`)

**Coverage:**
- ✅ Basic NL-to-Cypher translation
- ✅ Dangerous query blocking (DELETE, DROP, etc.)
- ✅ Prompt injection detection
- ✅ Complex query warnings
- ✅ Cost estimation accuracy
- ✅ Execution with audit trail
- ✅ Full preview → execute golden path

**Run tests:**
```bash
cd server
npm test -- NLToCypherService.test.ts
```

#### 6. **E2E Tests** (`tests/e2e/copilot-mvp.spec.ts`)

**Test Scenarios:**
- ✅ Complete golden path: preview → review → execute → view results
- ✅ Policy blocking with explanation
- ✅ Prompt injection blocking
- ✅ Complexity warning display
- ✅ Citation navigation
- ✅ Hypothesis generation
- ✅ Narrative building
- ✅ Error handling
- ✅ Keyboard accessibility

**Run E2E tests:**
```bash
npm run test:e2e -- copilot-mvp.spec.ts
```

## Golden Path User Story

**Persona:** Sarah, Intelligence Analyst

**Scenario:** Investigating financial fraud network

**Steps:**

1. **Open Investigation**
   - Sarah navigates to investigation "Operation Windfall"
   - Opens AI Copilot sidebar

2. **Ask Question**
   - Types: "Show me all persons who have transferred money to offshore accounts in the last 30 days"

3. **Preview Query**
   - Clicks "Preview Query"
   - Copilot generates Cypher in ~2 seconds
   - Shows explanation: "This query finds Person entities with TRANSFERRED relationships to Account entities marked as offshore, filtered by relationship timestamp"

4. **Review Estimate**
   - Estimated rows: 47
   - Cost: 0.94 units
   - Complexity: Low
   - ✅ Query allowed

5. **Inspect Cypher (Optional)**
   - Clicks "Show Generated Cypher"
   - Reviews actual query:
     ```cypher
     MATCH (p:Entity {investigationId: $investigationId, type: 'Person'})
       -[r:RELATIONSHIP {type: 'TRANSFERRED'}]->
       (a:Entity {type: 'Account', offshore: true})
     WHERE r.timestamp > datetime() - duration({days: 30})
     RETURN p, r, a
     LIMIT 100
     ```

6. **Execute Query**
   - Clicks "Execute Query"
   - Query runs in 78ms
   - Returns 47 records

7. **Analyze Results**
   - Views 47 entity citations (clickable)
   - Clicks "person-1547" to investigate John Doe
   - Notes audit ID for compliance: `audit-550e8400-e29b`

8. **Generate Hypothesis**
   - Switches to "Hypotheses" tab
   - Clicks "Generate Hypotheses"
   - Copilot suggests 3 hypotheses:
     - "John Doe may be coordinating offshore transfers for multiple clients" (82% confidence)
     - Evidence: Pattern of 12 transfers in 2-day windows
     - Next steps: Investigate common recipients, check for encrypted communications

9. **Build Narrative**
   - Switches to "Narrative" tab
   - Generates analytical report
   - Exports for case file

## API Endpoints Reference

### GraphQL API Surface

**Endpoint:** `/graphql`

**Authentication:** JWT Bearer token

**Rate Limiting:** 100 requests/minute per user

### Query Examples

#### 1. Preview Natural Language Query

```graphql
query PreviewQuery {
  previewNLQuery(input: {
    query: "Find all entities connected to suspicious activity"
    investigationId: "inv-123"
    userId: "analyst-456"
    dryRun: true
  }) {
    cypher
    explanation
    estimatedRows
    estimatedCost
    complexity
    warnings
    allowed
    blockReason
    auditId
  }
}
```

**Response:**
```json
{
  "data": {
    "previewNLQuery": {
      "cypher": "MATCH (e:Entity {investigationId: $investigationId})-[r]-(s:Entity {suspicious: true}) RETURN e, r, s LIMIT 100",
      "explanation": "Finds all entities connected to entities marked as suspicious",
      "estimatedRows": 34,
      "estimatedCost": 0.68,
      "complexity": "low",
      "warnings": [],
      "allowed": true,
      "blockReason": null,
      "auditId": "audit-abc123"
    }
  }
}
```

#### 2. Execute Query

```graphql
mutation ExecuteQuery {
  executeNLQuery(input: {
    query: "Show me persons"
    investigationId: "inv-123"
    dryRun: false
  }) {
    records
    summary {
      recordCount
      executionTime
    }
    citations
    auditId
  }
}
```

#### 3. Generate Hypotheses

```graphql
query GetHypotheses {
  generateHypotheses(input: {
    investigationId: "inv-123"
    count: 3
  }) {
    id
    statement
    confidence
    supportingEvidence {
      type
      description
      strength
    }
    suggestedSteps
  }
}
```

#### 4. Generate Narrative

```graphql
query BuildNarrative {
  generateNarrative(input: {
    investigationId: "inv-123"
    style: ANALYTICAL
  }) {
    id
    title
    content
    keyFindings
    citations
    confidence
    auditId
  }
}
```

## Policy Enforcement & Citations

### When Queries Are Blocked

Analysts see **clear policy explanations** when queries are blocked:

**Example 1: Dangerous Operation**
```
❌ Query Blocked

Reason: DELETE operations not allowed in queries

This query attempts to modify data, which violates
the read-only policy for copilot queries.

Audit ID: audit-550e8400
```

**Example 2: Prompt Injection**
```
❌ Query Blocked

Reason: Prompt injection attack detected

Your query contains patterns that may attempt to
manipulate the AI system. For security, this query
has been blocked and logged.

Detected patterns:
• Instruction override attempt
• Role confusion attack

Audit ID: audit-661f9511
```

**Example 3: Complexity Threshold**
```
❌ Query Blocked

Reason: Query too complex: estimated 15,247 rows

This query may consume excessive resources. Please
narrow your search criteria using:
• Date ranges
• Entity type filters
• Specific entity IDs

Audit ID: audit-772g0622
```

### Citation Display

Every query result includes **entity citations** showing which entities contributed to the answer:

**Results UI:**
```
✅ Results

📊 47 records • 78ms • 12 entities

Entity Citations:
[person-1547] [person-2891] [account-445] [account-667]
[org-3301] [doc-8845] [location-991] ...

Audit ID: audit-550e8400
```

**Clicking a citation:**
- Navigates to entity detail view
- Highlights entity in graph visualization
- Shows relationship context

## Guardrails Integration

The copilot enforces **8+ security policies** via `LLMGuardrailsService`:

1. **Prompt Injection Detection** - Blocks manipulation attempts
2. **PII Redaction** - Protects sensitive data
3. **Dangerous Operation Blocking** - No DELETE/DROP/CREATE
4. **Complexity Thresholds** - Prevents resource exhaustion
5. **Audit Logging** - Every query logged with unique ID
6. **Differential Privacy** (optional) - Noise injection for sensitive investigations
7. **GDPR Compliance** - Right to erasure support
8. **Rate Limiting** - Per-user query limits

**Audit Trail Example:**
```json
{
  "audit_id": "audit-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-20T15:30:00Z",
  "user_id": "analyst-456",
  "investigation_id": "inv-123",
  "query": "Show me persons connected to financial entities",
  "cypher_generated": "MATCH (p:Entity {investigationId: $investigationId...}",
  "allowed": true,
  "estimated_cost": 0.94,
  "actual_cost": 0.98,
  "execution_time_ms": 78,
  "records_returned": 47,
  "citations": ["person-1547", "person-2891", "account-445"],
  "privacy_level": "internal",
  "contains_pii": false
}
```

## Integration with Existing AI Infrastructure

The copilot MVP **leverages existing Summit AI services**:

- **GraphRAGService** - Used for hypothesis and narrative generation
- **LLMGuardrailsService** - Security validation for all queries
- **LLMAnalystService** - Report generation assistance
- **Neo4j Driver** - Graph query execution
- **Redis** - Query result caching (via GraphRAG)

**No duplicated infrastructure** - the MVP integrates cleanly with the existing AI/ML suite.

## Deployment Checklist

- [ ] Backend services deployed
  - [ ] NLToCypherService registered
  - [ ] GraphQL schema merged
  - [ ] Resolvers registered in Apollo Server
  - [ ] LLM API keys configured
  - [ ] Neo4j connection verified

- [ ] Frontend components deployed
  - [ ] CopilotSidebar component built
  - [ ] GraphQL queries generated
  - [ ] Syntax highlighter dependency added
  - [ ] Component integrated into investigation view

- [ ] Testing completed
  - [ ] Unit tests passing
  - [ ] E2E tests passing with seeded data
  - [ ] Load testing for LLM calls
  - [ ] Security audit for guardrails

- [ ] Documentation
  - [ ] API docs published
  - [ ] User guide for analysts
  - [ ] Runbook for operations team

- [ ] Monitoring
  - [ ] Copilot usage metrics
  - [ ] Query cost tracking
  - [ ] Blocked query alerts
  - [ ] Audit log retention policy

## Future Enhancements (Post-MVP)

1. **Query History** - Save and reuse successful queries
2. **Query Templates** - Pre-built queries for common patterns
3. **Multi-Investigation Queries** - Search across investigations
4. **Visualization Suggestions** - Recommend graph views for results
5. **Feedback Loop** - Analysts rate query quality to improve LLM
6. **Natural Language Filters** - Conversational refinement of results
7. **Export Formats** - CSV, JSON, PDF report generation
8. **Collaboration** - Share queries and narratives with team
9. **Real-time Subscriptions** - Live updates as queries execute
10. **Voice Input** - Speak queries instead of typing

## Cost Optimization

**Estimated costs per query:**
- LLM API call (NL → Cypher): $0.002 - $0.01
- Neo4j query execution: < $0.001
- GraphRAG embedding (if used): $0.001 - $0.005

**Monthly estimate for 1000 queries/analyst:**
- 10 analysts × 1000 queries = 10,000 queries/month
- Cost: $20 - $160/month in LLM API fees

**Optimization strategies:**
- Query result caching (already implemented via Redis)
- Prompt caching for schema context
- Batch hypothesis generation
- Use smaller LLM for simple queries (GPT-3.5 vs GPT-4)

## Support & Troubleshooting

**Common Issues:**

1. **"Query generation taking too long"**
   - Check LLM API latency
   - Verify schema context not too large
   - Consider caching investigation schemas

2. **"Many queries blocked"**
   - Review guardrail thresholds
   - Check if legitimate queries triggering false positives
   - Adjust complexity limits

3. **"Citations not showing entities"**
   - Verify entity IDs in Neo4j match returned records
   - Check `extractCitations` function in resolvers

4. **"Cypher syntax errors"**
   - LLM may need schema context adjustment
   - Add examples to prompt for specific patterns
   - Fall back to rule-based generation

## Conclusion

This AI Copilot MVP delivers a **production-ready, auditable** natural language query system for intelligence analysts. It prioritizes:

✅ **Transparency** - Every step visible to analyst
✅ **Safety** - Multi-layer guardrails and policy enforcement
✅ **Auditability** - Complete trail for compliance
✅ **Usability** - Clean UI with preview/approve workflow
✅ **Extensibility** - Hypothesis and narrative generation built-in

The implementation is **patch-ready** and can be adapted to specific deployment requirements while maintaining the core "auditable by design" philosophy.
