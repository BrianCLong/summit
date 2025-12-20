# GraphRAG Query Preview System

## Overview

The GraphRAG Query Preview system provides a comprehensive solution for natural language → graph query translation with full observability, cost estimation, and user control. This feature enables users to:

1. **Generate** Cypher/SQL queries from natural language
2. **Preview** queries with cost and risk analysis before execution
3. **Edit** generated queries in a sandbox environment
4. **Execute** queries with full glass-box observability
5. **Replay** queries with modifications for debugging

## Architecture

### Core Components

#### 1. GlassBoxRunService (`/server/src/services/GlassBoxRunService.ts`)

Captures execution runs with complete observability for replay and debugging.

**Features:**
- Captures prompts, parameters, tool calls, and results
- Step-by-step execution tracking
- Replay capability with modifications
- Parent-child relationship tracking for replays
- Automatic cleanup of old runs

**Key Methods:**
```typescript
createRun(input: CreateRunInput): Promise<GlassBoxRun>
addStep(runId: string, step: RunStep): Promise<void>
addToolCall(runId: string, toolCall: ToolCall): Promise<string>
updateStatus(runId: string, status: RunStatus): Promise<void>
getRun(runId: string): Promise<GlassBoxRun | null>
replayRun(runId: string, userId: string, options?: ReplayOptions): Promise<GlassBoxRun>
```

#### 2. QueryPreviewService (`/server/src/services/QueryPreviewService.ts`)

Generates query previews with cost estimation and edit capability.

**Features:**
- Natural language → Cypher/SQL translation
- Cost and risk estimation
- Query validation
- Investigation scoping
- Editable query preview before execution
- Sandbox mode for safe execution

**Key Methods:**
```typescript
createPreview(input: CreatePreviewInput): Promise<QueryPreview>
getPreview(previewId: string): Promise<QueryPreview | null>
editPreview(previewId: string, userId: string, editedQuery: string): Promise<QueryPreview>
executePreview(input: ExecutePreviewInput): Promise<ExecutePreviewResult>
```

#### 3. GraphRAGQueryService (`/server/src/services/GraphRAGQueryService.ts`)

Orchestrates the complete GraphRAG query flow with preview integration.

**Features:**
- NL query → preview → execute workflow
- Integration with existing GraphRAGService for RAG retrieval
- Citation resolution and enrichment
- Glass-box run capture for full observability
- Query editing and re-execution support

**Key Methods:**
```typescript
query(request: GraphRAGQueryRequest): Promise<GraphRAGQueryResponse>
executePreview(request: ExecutePreviewRequest): Promise<GraphRAGQueryResponse>
replayRun(runId: string, userId: string, options?: ReplayOptions): Promise<GraphRAGQueryResponse>
listRuns(investigationId: string, options?: ListOptions): Promise<{runs, total}>
```

### Database Schema

#### glass_box_runs Table

Stores execution runs with full observability:

```sql
CREATE TABLE glass_box_runs (
    id UUID PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('graphrag_query', 'nl_to_cypher', 'nl_to_sql', 'subgraph_retrieval')),
    status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    -- Input capture
    prompt TEXT NOT NULL,
    parameters JSONB,

    -- Execution trace
    steps JSONB,
    tool_calls JSONB,

    -- Output capture
    result JSONB,
    error TEXT,

    -- Replay support
    replayable BOOLEAN DEFAULT TRUE,
    parent_run_id UUID REFERENCES glass_box_runs(id),
    replay_count INTEGER DEFAULT 0,

    -- Timing
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,

    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### query_previews Table

Stores query previews with cost and risk analysis:

```sql
CREATE TABLE query_previews (
    id UUID PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- Input
    natural_language_query TEXT NOT NULL,
    parameters JSONB,

    -- Generated query
    language TEXT CHECK (language IN ('cypher', 'sql')),
    generated_query TEXT NOT NULL,
    query_explanation TEXT NOT NULL,

    -- Analysis
    cost_estimate JSONB NOT NULL,
    risk_assessment JSONB NOT NULL,
    syntactically_valid BOOLEAN,
    validation_errors JSONB,

    -- Execution control
    can_execute BOOLEAN,
    requires_approval BOOLEAN,
    sandbox_only BOOLEAN,

    -- Edit tracking
    edited_query TEXT,
    edited_by TEXT,
    edited_at TIMESTAMPTZ,

    -- Execution tracking
    executed BOOLEAN,
    executed_at TIMESTAMPTZ,
    execution_run_id UUID REFERENCES glass_box_runs(id),

    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## GraphQL API

### Queries

#### graphragQuery

Execute a GraphRAG query with optional preview:

```graphql
query {
  graphragQuery(input: {
    investigationId: "inv-001"
    question: "What entities are connected to person X?"
    focusEntityIds: ["entity-123"]
    maxHops: 2
    generateQueryPreview: true
    autoExecute: false
  }) {
    answer
    confidence
    citations {
      entityId
      entityName
      entityKind
      snippetText
      confidence
    }
    why_paths {
      from
      to
      relId
      type
      supportScore
    }
    preview {
      id
      generatedQuery
      queryExplanation
      costLevel
      riskLevel
      canExecute
      requiresApproval
    }
    runId
    executionTimeMs
    subgraphSize {
      nodeCount
      edgeCount
    }
  }
}
```

#### queryPreview

Get a query preview by ID:

```graphql
query {
  queryPreview(id: "preview-123") {
    id
    naturalLanguageQuery
    generatedQuery
    queryExplanation
    costEstimate {
      level
      breakdown {
        cartesianProduct
        variableLengthPath
        fullTableScan
      }
      warnings
    }
    riskAssessment {
      level
      concerns
      piiFields
      mutationDetected
      recommendedActions
    }
    syntacticallyValid
    validationErrors
    canExecute
    requiresApproval
  }
}
```

#### glassBoxRun

Get a glass-box run by ID:

```graphql
query {
  glassBoxRun(id: "run-123") {
    id
    investigationId
    type
    status
    prompt
    parameters
    steps {
      stepNumber
      type
      description
      durationMs
    }
    toolCalls {
      name
      parameters
      result
      durationMs
    }
    result
    error
    durationMs
    replayable
    parentRunId
    replayCount
  }
}
```

### Mutations

#### createQueryPreview

Create a query preview without executing:

```graphql
mutation {
  createQueryPreview(input: {
    investigationId: "inv-001"
    question: "Find all suspicious transactions"
    language: cypher
    focusEntityIds: ["entity-123"]
    maxHops: 2
  }) {
    id
    generatedQuery
    costEstimate { level }
    riskAssessment { level }
    canExecute
  }
}
```

#### editQueryPreview

Edit a query preview:

```graphql
mutation {
  editQueryPreview(
    previewId: "preview-123"
    editedQuery: "MATCH (n:Entity) WHERE n.risk > 0.7 RETURN n LIMIT 10"
  ) {
    id
    editedQuery
    editedBy
    editedAt
    syntacticallyValid
  }
}
```

#### executeQueryPreview

Execute a query preview:

```graphql
mutation {
  executeQueryPreview(input: {
    previewId: "preview-123"
    useEditedQuery: true
    dryRun: false
    maxRows: 100
  }) {
    answer
    citations { entityId entityName }
    runId
    executionTimeMs
  }
}
```

#### replayRun

Replay a run with optional modifications:

```graphql
mutation {
  replayRun(input: {
    runId: "run-123"
    modifiedQuestion: "Show me more details"
    skipCache: true
  }) {
    answer
    citations { entityId }
    runId
    executionTimeMs
  }
}
```

## Usage Examples

### Example 1: Simple Query with Auto-Execute

```typescript
const response = await graphRAGQueryService.query({
  investigationId: 'inv-001',
  tenantId: 'tenant-001',
  userId: 'user-001',
  question: 'What entities are connected to person John Doe?',
  autoExecute: true,
});

console.log('Answer:', response.answer);
console.log('Citations:', response.citations);
console.log('Run ID:', response.runId);
```

### Example 2: Preview Before Execute

```typescript
// Step 1: Generate preview
const response = await graphRAGQueryService.query({
  investigationId: 'inv-001',
  tenantId: 'tenant-001',
  userId: 'user-001',
  question: 'Find all suspicious transactions over $10,000',
  generateQueryPreview: true,
  autoExecute: false, // Don't execute yet
});

console.log('Generated Query:', response.preview.generatedQuery);
console.log('Cost Level:', response.preview.costLevel);
console.log('Risk Level:', response.preview.riskLevel);

// Step 2: Review and execute
if (response.preview.canExecute) {
  const execResponse = await graphRAGQueryService.executePreview({
    previewId: response.preview.id,
    userId: 'user-001',
  });

  console.log('Answer:', execResponse.answer);
}
```

### Example 3: Edit Query Before Execute

```typescript
// Generate preview
const preview = await queryPreviewService.createPreview({
  investigationId: 'inv-001',
  tenantId: 'tenant-001',
  userId: 'user-001',
  naturalLanguageQuery: 'Find risky entities',
  language: 'cypher',
});

// Edit query
const edited = await queryPreviewService.editPreview(
  preview.id,
  'user-001',
  `MATCH (n:Entity {investigationId: $investigationId})
   WHERE n.riskScore > 0.8
   RETURN n.id, n.name, n.riskScore
   ORDER BY n.riskScore DESC
   LIMIT 20`
);

// Execute edited query
const response = await graphRAGQueryService.executePreview({
  previewId: preview.id,
  userId: 'user-001',
  useEditedQuery: true,
});
```

### Example 4: Replay with Modifications

```typescript
// Execute original query
const original = await graphRAGQueryService.query({
  investigationId: 'inv-001',
  tenantId: 'tenant-001',
  userId: 'user-001',
  question: 'Show entities from last week',
  autoExecute: true,
});

// Replay with modified question
const replayed = await graphRAGQueryService.replayRun(
  original.runId,
  'user-001',
  {
    modifiedQuestion: 'Show entities from last month',
    skipCache: true,
  }
);

// Get replay history
const history = await graphRAGQueryService.getReplayHistory(original.runId);
console.log('Replayed', history.length, 'times');
```

## Monitoring & Metrics

### Prometheus Metrics

```typescript
// GraphRAG Query metrics
intelgraph_graphrag_query_total{status="success|failed", hasPreview="true|false"}
intelgraph_graphrag_query_duration_ms{hasPreview="true|false"}

// Query Preview metrics
intelgraph_query_previews_total{language="cypher|sql", status="created"}
intelgraph_query_preview_latency_ms{language="cypher|sql"}
intelgraph_query_preview_errors_total{language="cypher|sql"}
intelgraph_query_preview_executions_total{language="cypher|sql", dryRun="true|false", status="success|failed"}

// Glass-Box Run metrics
intelgraph_glass_box_runs_total{type="graphrag_query|nl_to_cypher|nl_to_sql", status="pending|running|completed|failed"}
intelgraph_glass_box_run_duration_ms{type="graphrag_query|nl_to_cypher|nl_to_sql"}
intelgraph_glass_box_cache_hits_total{operation="get_run"}
```

### Logging

All operations are logged with structured context:

```json
{
  "level": "info",
  "msg": "Completed GraphRAG query",
  "runId": "run-123",
  "investigationId": "inv-001",
  "confidence": 0.85,
  "citationCount": 5,
  "executionTimeMs": 1234,
  "hasPreview": true
}
```

## Testing

### Acceptance Criteria

The system meets the following acceptance criteria:

1. **≥95% Syntactic Validity**: Test suite validates 20+ diverse prompts for syntactic correctness
2. **Citation Resolution**: All citations resolve to valid entities in the investigation subgraph
3. **Run Replayability**: All runs are replayable with optional modifications

### Running Tests

```bash
cd server
pnpm test src/services/__tests__/GraphRAGQueryService.test.ts
```

### Test Coverage

The test suite covers:
- Syntactic validity of generated queries
- Citation enrichment and resolution
- Glass-box run capture
- Run replay with modifications
- Query preview workflow
- Cost estimation accuracy
- Edit and re-execute flow

## Security Considerations

### Query Validation

All generated queries are validated for:
- **Mutation operations**: CREATE, DELETE, REMOVE, SET, MERGE
- **PII access**: email, ssn, phone, address, credit_card
- **Cartesian products**: Multiple MATCH without WHERE
- **Missing LIMIT**: Unbounded result sets

### Investigation Scoping

All queries are automatically scoped to the investigation:

```cypher
MATCH (e:Entity)
WHERE e.investigationId = $investigationId
// ... rest of query
```

### Approval Requirements

Queries requiring approval:
- Cost level: `high` or `very-high`
- Risk level: `high`
- Mutation operations detected
- PII fields accessed

## Deployment

### Database Migration

Run the migration to create required tables:

```bash
cd server
psql -d your_database -f src/db/migrations/postgres/009_create_graphrag_query_preview_tables.sql
```

### Configuration

No additional configuration required. The system integrates with existing:
- PostgreSQL connection pool
- Neo4j driver
- Redis cache (optional)
- LLM service
- Embedding service

## Troubleshooting

### Preview Generation Fails

Check:
1. NlToCypherService is properly configured
2. Neo4j connection is healthy
3. Investigation exists and has schema context

### Query Execution Fails

Check:
1. Query is syntactically valid
2. Investigation ID is correct
3. User has necessary permissions
4. Neo4j/PostgreSQL connections are healthy

### Replay Fails

Check:
1. Original run exists and is replayable
2. Parent run ID is valid
3. Modified parameters are valid

## Future Enhancements

1. **Advanced Cost Modeling**: More accurate cost estimates based on graph size
2. **Query Optimization**: Automatic query rewriting for better performance
3. **Collaborative Editing**: Multiple users editing same preview
4. **Query Templates**: Reusable query patterns
5. **SQL Support**: Full NL-to-SQL translation with preview
6. **Visual Query Builder**: Graphical query construction interface

## References

- [GraphRAG Service Documentation](./graphrag-service.md)
- [NL-to-Cypher Service Documentation](./nl-to-cypher-service.md)
- [Investigation Workflow Documentation](./investigation-workflow.md)
