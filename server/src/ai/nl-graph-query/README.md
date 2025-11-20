# NL Graph Query Copilot

Backend service that translates natural-language questions into safe, previewable Cypher graph queries. This service **does not execute queries** - it only generates and validates them.

## API Endpoint

### `POST /api/ai/nl-graph-query/compile`

Compiles a natural language prompt into a Cypher query with cost estimation and explanation.

#### Request Body

```typescript
{
  prompt: string;              // Natural language query (max 1000 chars)
  schemaContext: {            // Graph schema and policy context
    nodeLabels?: string[];
    relationshipTypes?: string[];
    nodeProperties?: Record<string, string[]>;
    relationshipProperties?: Record<string, string[]>;
    policyTags?: Array<{
      label: string;
      classification: string;
      purpose?: string[];
    }>;
    tenantId?: string;
    userId?: string;
    investigationId?: string;
  };
  parameters?: Record<string, any>;  // Optional parameter bindings
  verbose?: boolean;                 // Detailed explanation if true
}
```

#### Success Response (200 OK)

```typescript
{
  queryId: string;              // Unique query identifier
  cypher: string;               // Generated Cypher query
  estimatedCost: {
    nodesScanned: number;       // Estimated nodes to scan
    edgesScanned: number;       // Estimated relationships to scan
    costClass: 'low' | 'medium' | 'high' | 'very-high';
    estimatedTimeMs: number;    // Estimated execution time
    estimatedMemoryMb: number;  // Estimated memory usage
    costDrivers: string[];      // Factors contributing to cost
  };
  explanation: string;          // Plain language explanation
  requiredParameters: string[]; // Parameters needed for execution
  isSafe: boolean;             // Whether safe to execute
  warnings: string[];          // Warnings about potential issues
  timestamp: Date;
}
```

#### Error Response (400 Bad Request)

```typescript
{
  code: string;              // Error code
  message: string;           // Human-readable error message
  suggestions: string[];     // How to fix the error
  originalPrompt: string;    // The prompt that caused the error
}
```

## Query Cookbook

The service supports these query pattern categories:

### 1. Basic Patterns
- `show all nodes` - List nodes with pagination
- `count nodes` - Count total nodes
- `show relationships` - Display relationships
- `show neighbors of X` - Find connected entities

### 2. Time-Travel Queries
- `show graph state at [timestamp]` - View graph at specific time
- `show changes between [start] and [end]` - Track modifications

### 3. Policy-Aware Queries
- `show [EntityType] with classification [level]` - Filter by security classification
- Automatic tenant filtering when `tenantId` is provided
- Policy tag filtering based on `schemaContext.policyTags`

### 4. Geo-Temporal Queries
- `show entities near [location] at [time]` - Spatial-temporal search
- Uses `point.distance()` for geographic filtering

### 5. Narrative/Timeline Queries
- `show timeline of events for [subject]` - Chronological event sequences
- Orders by timestamp with relationship context

### 6. Course of Action (COA) Queries
- `shortest path from X to Y` - Find shortest route
- `find paths from X to Y` - All shortest paths
- `show paths that avoid/include [criteria]` - Constrained pathfinding

## Cost Estimation

Queries are analyzed for execution cost based on:
- Match clause complexity
- Variable-length paths
- Cartesian product detection
- Index usage
- Aggregations
- Sorting requirements

Cost classes:
- **Low**: < 100 nodes, < 50 edges, < 100ms
- **Medium**: < 1000 nodes, < 500 edges, < 500ms
- **High**: < 10000 nodes, < 5000 edges, < 1000ms
- **Very High**: > 10000 nodes, > 5000 edges, > 1000ms

Queries with "very-high" cost are marked as `isSafe: false`.

## Security

The service enforces:
1. **Read-only queries**: Mutation operations (CREATE, DELETE, SET, etc.) are blocked
2. **Syntax validation**: Checks for balanced parentheses, brackets, and braces
3. **Dangerous operations**: Detects and blocks DROP, DETACH DELETE, schema modifications
4. **Parameter binding**: Encourages parameterized queries to prevent injection
5. **Tenant isolation**: Automatic tenant filtering when context provided

## Examples

### Example 1: Basic Query

```bash
curl -X POST http://localhost:4000/api/ai/nl-graph-query/compile \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "show all nodes",
    "schemaContext": {
      "tenantId": "tenant-123"
    }
  }'
```

Response:
```json
{
  "queryId": "550e8400-e29b-41d4-a716-446655440000",
  "cypher": "MATCH (n) WHERE n.tenantId = $tenantId RETURN n LIMIT 25",
  "estimatedCost": {
    "nodesScanned": 100,
    "edgesScanned": 0,
    "costClass": "low",
    "estimatedTimeMs": 50,
    "estimatedMemoryMb": 10,
    "costDrivers": ["Query uses indexed tenantId property (good partitioning)"]
  },
  "explanation": "Retrieves up to 25 matching entities",
  "requiredParameters": ["tenantId"],
  "isSafe": true,
  "warnings": [],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Example 2: Time-Travel Query

```bash
curl -X POST http://localhost:4000/api/ai/nl-graph-query/compile \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "show graph state at 2024-01-15",
    "schemaContext": {
      "tenantId": "tenant-123",
      "userId": "user-456"
    },
    "verbose": true
  }'
```

### Example 3: Path Analysis

```bash
curl -X POST http://localhost:4000/api/ai/nl-graph-query/compile \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "shortest path from suspect1 to suspect2",
    "schemaContext": {
      "tenantId": "tenant-123",
      "investigationId": "inv-789"
    },
    "parameters": {
      "startId": "entity-123",
      "endId": "entity-456"
    }
  }'
```

## Additional Endpoints

### `GET /api/ai/nl-graph-query/patterns`

Returns information about all supported query patterns.

### `GET /api/ai/nl-graph-query/health`

Health check endpoint that returns service status and cache statistics.

### `POST /api/ai/nl-graph-query/cache/clear`

Clears the query compilation cache.

## Architecture

```
nl-graph-query/
├── types.ts                    # TypeScript type definitions
├── query-patterns.ts           # Cookbook of query patterns
├── cost-estimator.ts           # Query cost analysis
├── validator.ts                # Cypher syntax & security validation
├── explainer.ts                # Plain language explanation generation
├── nl-graph-query.service.ts   # Main service logic
├── index.ts                    # Public API exports
└── README.md                   # This file

routes/
└── nl-graph-query.ts           # Express route handlers

tests/
└── nl-graph-query.test.ts      # Comprehensive test suite
```

## Testing

The service includes comprehensive tests covering:
- All query cookbook patterns
- Cost estimation accuracy
- Security validation
- Error handling
- Caching behavior
- No side effects (no database execution)

Run tests:
```bash
npm test tests/nl-graph-query.test.ts
```

## Design Principles

1. **Compilation Only**: Never executes queries, only generates and validates
2. **No Database Access**: Service has no database client dependencies
3. **Safe by Default**: Blocks dangerous operations, mutations, and high-cost queries
4. **Explainable**: Every query comes with plain language explanation
5. **Cost Aware**: Provides realistic cost estimates before execution
6. **Policy Integrated**: Respects tenant isolation and classification levels
7. **Cacheable**: Query compilations are cached for performance

## Future Enhancements

- [ ] LLM integration for unrecognized patterns
- [ ] Query optimization suggestions
- [ ] Historical cost tracking for better estimates
- [ ] Support for more complex graph patterns
- [ ] Integration with graph schema introspection
- [ ] Query explanation visualization
