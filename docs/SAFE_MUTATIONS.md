# Safe Mutations & Token Counting System

## Overview

The IntelGraph and Maestro platforms now include a comprehensive safe mutations system with token counting integration for LLM budgeting and cost control. This system provides:

- **Type-safe mutations** with Zod validation
- **Token counting** for OpenAI, Anthropic, and Gemini models
- **Budget enforcement** with configurable limits
- **Audit trails** for all mutation operations
- **Rollback capabilities** for failed operations
- **Security validation** to prevent injection attacks

## Architecture

### Token Counting System

```typescript
// Count tokens for any supported model
const result = await countTokens('openai', 'gpt-4o-mini', prompt);
console.log(`Tokens: ${result.total}, Cost: $${result.estimatedCostUSD}`);
```

**Supported Providers:**

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic**: Claude-3-5-Sonnet, Claude-3-Opus, Claude-3-Haiku
- **Gemini**: Gemini-1.5-Pro, Gemini-1.5-Flash

### Safe Mutations

#### Maestro Safe Mutations

```typescript
import { MaestroSafeMutations } from './conductor-ui/frontend/src/maestro/mutations/SafeMutations';

// Create a run with validation and rollback
const result = await MaestroSafeMutations.createRun({
  pipeline: 'data-processing',
  autonomyLevel: 3,
  budgetCap: 200,
  canaryPercent: 0.1,
});

if (!result.success) {
  console.error('Validation failed:', result.validationErrors);
}
```

#### IntelGraph Safe Mutations

```typescript
import { IntelGraphSafeMutations } from './server/src/graphql/mutations/SafeMutations';

// Create an entity with full audit trail
const context = {
  user: {
    id: 'user-123',
    tenantId: 'tenant-123',
    permissions: ['entity:create'],
  },
  requestId: 'req-123',
  timestamp: new Date().toISOString(),
  source: 'graphql',
};

const result = await IntelGraphSafeMutations.createEntity(
  {
    tenantId: 'tenant-123',
    kind: 'Person',
    labels: ['Individual'],
    props: { name: 'John Doe' },
  },
  context,
);
```

## API Endpoints

### Token Counting

#### `POST /api/tokcount`

Count tokens for a single prompt:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "prompt": "Analyze this intelligence report...",
  "completion": "Based on the report..."
}
```

Response:

```json
{
  "model": "gpt-4o-mini",
  "prompt": 1250,
  "completion": 850,
  "total": 2100,
  "estimatedCostUSD": 0.00315,
  "budget": {
    "limit": 120000,
    "withinBudget": true,
    "percentUsed": 1.75,
    "recommendAction": "proceed"
  }
}
```

#### `POST /api/tokcount/batch`

Count tokens for multiple prompts:

```json
{
  "requests": [
    {
      "id": "req-1",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "prompt": "First prompt"
    },
    {
      "id": "req-2",
      "provider": "anthropic",
      "model": "claude-3-haiku",
      "prompt": "Second prompt"
    }
  ]
}
```

#### `GET /api/tokcount/models`

Get supported models and pricing information.

#### `GET /api/tokcount/budget`

Get current token budget configuration.

### LLM Endpoints with Budget Enforcement

All endpoints under `/api/llm/*` automatically enforce token budgets:

#### `POST /api/llm/generate`

Generate text with automatic token counting:

```json
{
  "model": "gpt-4o-mini",
  "prompt": "Generate a threat assessment...",
  "maxTokens": 1000
}
```

## Client Components

### TokenMeter Component

```tsx
import { TokenMeter } from './components/TokenMeter';

// Basic usage
<TokenMeter
  model="gpt-4o-mini"
  text={promptText}
  showCost={true}
/>

// With budget enforcement
<TokenMeter
  model="gpt-4o-mini"
  text={promptText}
  onBudgetChange={(status) => {
    if (status === 'block') {
      setSubmitDisabled(true);
    }
  }}
/>
```

## Configuration

### Environment Variables

```bash
# Token budget limits
TOKEN_BUDGET_LIMIT=120000              # Max tokens per request
TOKEN_WARNING_THRESHOLD=80             # Warning threshold (%)
MAX_TOKENS_PER_REQUEST=500000          # Hard limit per request

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000            # Rate limit window
RATE_LIMIT_MAX=600                    # Max requests per window

# Security
NODE_ENV=production                    # Enable production security
DLP_ENABLED=true                      # Enable DLP scanning
```

### Model Pricing Configuration

Pricing is automatically updated in `server/src/lib/tokcount.ts`:

```typescript
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  // ... more models
};
```

## Security Features

### Input Validation

All mutations use comprehensive validation:

```typescript
// Entity validation
const EntityMutationSchema = z.object({
  tenantId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  kind: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  props: z
    .record(z.any())
    .refine(
      (props) => JSON.stringify(props).length <= 32768,
      'Entity properties too large',
    ),
});
```

### Business Rules

```typescript
// Prevent self-referential relationships
if (relationship.srcId === relationship.dstId) {
  throw new Error('Self-referential relationships not allowed');
}

// Enforce entity count limits
if (context.entityCount >= 50000) {
  throw new Error('Investigation has reached maximum entity limit');
}
```

### Security Scanning

```typescript
// Detect potential injection attacks
const sqlInjectionPatterns = [
  /(\bSELECT\b.*\bFROM\b)/i,
  /(\bDROP\b.*\bTABLE\b)/i,
];

if (sqlInjectionPatterns.some((pattern) => pattern.test(input))) {
  throw new Error('Potential SQL injection detected');
}
```

## Audit Logging

All mutations create comprehensive audit logs:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  tenant_id VARCHAR NOT NULL,
  operation VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT
);
```

## Error Handling & Rollback

### Automatic Rollback

```typescript
const result = await MaestroSafeMutations.createRun(config);

if (!result.success && result.rollbackFn) {
  await result.rollbackFn(); // Automatically undo changes
}
```

### Batch Operations with Partial Rollback

```typescript
const batchResult = await MaestroSafeMutations.batchMutations([
  () => createRunMutation(config1),
  () => createRunMutation(config2),
  () => createRunMutation(config3),
]);

if (!batchResult.success) {
  await batchResult.rollbackAll(); // Rollback successful operations
}
```

## Testing

### Integration Tests

```bash
# Run safe mutations tests
npm test -- tests/integration/safe-mutations.test.ts

# Run token counting tests
npm test -- --grep "Token Counting Integration"

# Run validation tests
npm test -- --grep "Business Rule Validation"
```

### Test Examples

```typescript
describe('Token Budget Enforcement', () => {
  it('should block requests exceeding budget', () => {
    const budgetCheck = validateTokenBudget(130000, 120000);
    expect(budgetCheck.withinBudget).toBe(false);
    expect(budgetCheck.recommendAction).toBe('block');
  });
});
```

## Performance Considerations

### Token Counting Performance

- OpenAI models: ~1ms for 10K characters using `gpt-tokenizer`
- Batch operations: Process up to 50 requests in parallel
- Caching: Results cached for 5 minutes for identical inputs

### Database Performance

- Audit logs: Partitioned by date, retained for 90 days
- Validation: Schema validation cached in memory
- Rate limiting: Redis-backed for distributed deployments

## Migration Guide

### Existing Code Migration

1. **Replace direct mutations** with safe mutations:

```typescript
// Before
const entity = await session.run('CREATE (e:Entity {...}) RETURN e', params);

// After
const result = await IntelGraphSafeMutations.createEntity(entityData, context);
```

2. **Add token counting** to LLM calls:

```typescript
// Before
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});

// After
const tokenCheck = await countTokens('openai', 'gpt-4o-mini', prompt);
if (tokenCheck.budget.recommendAction === 'block') {
  throw new Error('Token budget exceeded');
}

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});
```

3. **Add client-side token meters**:

```tsx
// Add to prompt editors
<TokenMeter model="gpt-4o-mini" text={prompt} />
```

## Troubleshooting

### Common Issues

1. **Token counting errors**: Install `gpt-tokenizer` dependency
2. **Validation failures**: Check Zod schema requirements
3. **Budget exceeded**: Adjust `TOKEN_BUDGET_LIMIT` or optimize prompts
4. **Audit log errors**: Verify PostgreSQL permissions

### Debug Mode

```bash
DEBUG=intelgraph:* npm run dev
```

### Health Checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/tokcount/budget
```

## Future Enhancements

- [ ] **Adaptive budgeting** based on user behavior
- [ ] **Token usage forecasting** with trend analysis
- [ ] **Multi-model routing** for cost optimization
- [ ] **Real-time budget notifications** via WebSocket
- [ ] **Enhanced audit analytics** with usage dashboards
