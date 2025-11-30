# AI Copilot: Natural Language → Cypher/SQL with Guardrails

> **Service Location**: `services/copilot/`
> **API Base URL**: `http://localhost:8003/copilot`

## Overview

The AI Copilot service translates natural language questions into safe graph (Cypher) or SQL queries. It enforces strict guardrails to prevent dangerous operations and requires explicit user confirmation before execution.

### Key Features

- **Natural Language to Query**: Converts human questions to structured queries
- **Safety Guardrails**: Static analysis prevents dangerous operations
- **Preview → Confirm → Execute**: Two-step process requires explicit confirmation
- **Policy Integration**: Clearance and role-based access control
- **Comprehensive Audit Logging**: Every operation is logged

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend / Client                           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    POST /copilot/preview   │
                    │    (Natural Language)      │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                       Copilot Service                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  LLM Adapter │  │   Safety     │  │   Policy     │              │
│  │  (Mock/Real) │  │  Analyzer    │  │   Engine     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └────────┬────────┴────────┬────────┘                       │
│                  │                 │                                │
│         ┌────────▼────────┐ ┌──────▼──────┐                        │
│         │  Draft Query    │ │  Audit Log  │                        │
│         │  Repository     │ │             │                        │
│         └─────────────────┘ └─────────────┘                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   POST /copilot/execute    │
                    │   (Requires Confirmation)  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Neo4j / PostgreSQL      │
                    │    Query Execution         │
                    └───────────────────────────┘
```

## API Endpoints

### POST /copilot/preview

Generate a draft query from natural language.

**Request:**
```json
{
  "userText": "Who is connected to Alice?",
  "dialect": "CYPHER",
  "investigationId": "inv-123",
  "conversationId": "conv-456"
}
```

**Response:**
```json
{
  "draft": {
    "id": "draft-abc123",
    "userText": "Who is connected to Alice?",
    "query": "MATCH (target:Entity {name: $name})-[r]-(connected:Entity)\nRETURN connected.id, connected.name, type(r)\nLIMIT 100",
    "dialect": "CYPHER",
    "explanation": "Find all entities directly connected to 'Alice'",
    "assumptions": [
      "'Alice' is a known entity in the graph",
      "Looking for direct connections only (1 hop)"
    ],
    "parameters": {
      "name": "Alice",
      "limit": 100
    },
    "estimatedCost": {
      "depth": 1,
      "expectedRows": 100,
      "complexity": "LOW"
    },
    "safety": {
      "passesStaticChecks": true,
      "violations": [],
      "warnings": [],
      "estimatedDepth": 1,
      "estimatedRows": 100
    },
    "createdAt": "2025-11-27T12:00:00Z",
    "createdBy": "user-001",
    "expiresAt": "2025-11-27T12:30:00Z"
  }
}
```

### POST /copilot/execute

Execute a confirmed draft query.

**Request:**
```json
{
  "draftId": "draft-abc123",
  "confirm": true,
  "overrideSafety": false
}
```

**Response:**
```json
{
  "draftId": "draft-abc123",
  "results": [
    { "id": "e1", "name": "Bob", "relationship": "WORKS_WITH" },
    { "id": "e2", "name": "TechCorp", "relationship": "WORKS_FOR" }
  ],
  "truncated": false,
  "executedAt": "2025-11-27T12:01:00Z",
  "executionTimeMs": 52,
  "rowCount": 2
}
```

### GET /copilot/draft/:id

Retrieve a specific draft by ID.

### GET /copilot/drafts

List user's recent drafts.

### DELETE /copilot/draft/:id

Delete a draft.

### GET /copilot/health

Service health check.

## Safety Model

### Static Safety Checks

The SafetyAnalyzer performs the following checks on every generated query:

| Check | Description | Severity |
|-------|-------------|----------|
| **Forbidden Operations** | Blocks DELETE, DROP, CREATE, MERGE, SET | CRITICAL |
| **Row Limits** | Requires LIMIT clause ≤ policy max | ERROR |
| **Depth Limits** | Traversal depth ≤ policy max (default 6) | ERROR |
| **Disallowed Labels** | Blocks access to restricted node/edge types | CRITICAL |
| **Unbounded Patterns** | Rejects `[*]` without upper bound | ERROR |
| **Injection Patterns** | Detects SQL/Cypher injection attempts | CRITICAL |
| **Syntax Validation** | Basic query structure validation | ERROR |

### Policy Integration

Policies are enforced based on user context:

```typescript
interface PolicyContext {
  maxDepth: number;           // Max traversal depth (default: 6)
  maxRows: number;            // Max result rows (default: 100)
  disallowedLabels: string[]; // Restricted labels
  restrictedSensitivityLevels: string[];
}
```

### Safety Override

Privileged users (ADMIN, SUPERVISOR) can override safety checks:

1. Must provide `overrideSafety: true`
2. Must provide a `reason` explaining the override
3. Override is logged in audit trail

## Frontend Integration

### Workflow

1. **User enters question** → Call `POST /copilot/preview`
2. **Display draft** → Show:
   - Generated query
   - Explanation and assumptions
   - Safety status (pass/fail)
   - Violations with suggested fixes
3. **User reviews and confirms** → Call `POST /copilot/execute` with `confirm: true`
4. **Display results** → Show query results

### Handling Safety Violations

When `safety.passesStaticChecks === false`:

```jsx
{draft.safety.violations.map(v => (
  <Alert severity={v.severity === 'CRITICAL' ? 'error' : 'warning'}>
    <AlertTitle>{v.code}</AlertTitle>
    {v.message}
  </Alert>
))}

{draft.safety.suggestedFixes?.map(fix => (
  <Typography variant="body2">Suggestion: {fix}</Typography>
))}
```

### Example Integration

```typescript
// Preview
const previewResponse = await fetch('/copilot/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userText: question })
});
const { draft } = await previewResponse.json();

// Show to user for review...

// Execute (after user confirmation)
if (userConfirmed) {
  const executeResponse = await fetch('/copilot/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftId: draft.id,
      confirm: true
    })
  });
  const results = await executeResponse.json();
}
```

## Extending the Copilot

### Adding New Node/Edge Types

Update the schema in `routes.ts`:

```typescript
const DEFAULT_SCHEMA: GraphSchemaDescription = {
  nodeTypes: [
    // Add new node types here
    {
      name: 'Vehicle',
      labels: ['Entity', 'Vehicle'],
      fields: [
        { name: 'id', type: 'id' },
        { name: 'make', type: 'string' },
        { name: 'model', type: 'string' },
        { name: 'plate', type: 'string' }
      ]
    }
  ],
  edgeTypes: [
    // Add new edge types here
    {
      name: 'OWNS',
      from: 'Person',
      to: 'Vehicle',
      fields: [{ name: 'since', type: 'datetime' }]
    }
  ]
};
```

### Adjusting Policy Limits

Modify policy resolver in `routes.ts`:

```typescript
export function createDefaultPolicyResolver() {
  return (policyContextId?: string, user?: UserContext) => ({
    maxDepth: 6,
    maxRows: user?.roles.includes('ADMIN') ? 500 : 100,
    disallowedLabels: ['SensitivePerson'],
    // ...
  });
}
```

### Implementing Real LLM Adapter

Replace `MockLlmAdapter` with a real implementation:

```typescript
export class OpenAILlmAdapter implements LlmAdapter {
  constructor(private apiKey: string) {}

  async generateQuery(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    // Build prompt from schema and policy
    const systemPrompt = this.buildSystemPrompt(input.schema, input.policy);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.userText }
      ]
    });

    // Parse response
    return JSON.parse(response.choices[0].message.content);
  }
}
```

## Audit Trail

Every operation is logged:

| Action | When Logged |
|--------|-------------|
| `PREVIEW` | Draft query generated |
| `EXECUTE` | Query executed successfully |
| `EXECUTE_DENIED` | Execution blocked (safety/policy) |
| `SAFETY_OVERRIDE` | Safety checks bypassed by admin |

Audit records include:
- User ID and tenant
- Draft ID and query text
- Safety summary
- Execution results
- Timestamps

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8003 | Service port |
| `LOG_LEVEL` | info | Logging level |
| `CORS_ORIGIN` | * | CORS allowed origins |

Service configuration (in code):

```typescript
{
  defaultDialect: 'CYPHER',
  draftExpirationMs: 30 * 60 * 1000,  // 30 minutes
  maxDraftsPerUser: 20,
  requireConfirmation: true,
  allowSafetyOverride: true,
  privilegedRoles: ['ADMIN', 'SUPERVISOR', 'LEAD']
}
```

## Development

### Running Locally

```bash
cd services/copilot
pnpm install
pnpm dev
```

### Running Tests

```bash
pnpm test
```

### Building

```bash
pnpm build
```

## Security Considerations

1. **No query executes without preview + confirm** - This is non-negotiable
2. **Guardrails fail safe** - Unknown patterns are rejected, not allowed
3. **Audit everything** - Complete trail of all operations
4. **Principle of least privilege** - Default policy is restrictive
5. **Override transparency** - Safety overrides require justification and are logged
