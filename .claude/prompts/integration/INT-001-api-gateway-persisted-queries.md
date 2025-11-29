---
id: INT-001
name: API Gateway with Persisted Queries & Cost Guards
slug: api-gateway-persisted-queries
category: integration
subcategory: api-management
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Stands up a GraphQL gateway that supports persisted queries, cost estimation/limits,
  field-level authz, and partial-results with hints. Adds token-bucket rate control
  and signed webhooks with DLQ.

objective: |
  Provide secure, performant, cost-controlled GraphQL API with enterprise features.

tags:
  - api-gateway
  - graphql
  - persisted-queries
  - rate-limiting
  - cost-control
  - webhooks
  - field-level-authz

dependencies:
  services:
    - redis
    - postgresql
  packages:
    - "@apollo/server"
    - "@apollo/gateway"
  external:
    - "@apollo/server@^4.0.0"
    - "ioredis@^5.3.0"

deliverables:
  - type: service
    description: GraphQL gateway with enterprise features
  - type: sdk
    description: Client SDKs (TypeScript, Java, Python)
  - type: tests
    description: Contract tests and gateway integration tests
  - type: documentation
    description: API reference and integration guide

acceptance_criteria:
  - description: Persisted queries work correctly
    validation: Execute query by hash, verify response
  - description: Cost limits enforced
    validation: Exceed cost limit, verify query blocked
  - description: Field-level authz enforced
    validation: Request unauthorized field, verify filtered
  - description: Rate limiting works
    validation: Exceed rate limit, verify 429 response
  - description: Signed webhooks delivered
    validation: Trigger event, verify webhook signature

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - FIN-001
  - GOV-001
  - MIG-001

blueprint_path: ../blueprints/templates/service
---

# API Gateway with Persisted Queries & Cost Guards

## Objective

Build production-ready GraphQL API gateway with security, performance, and cost controls essential for intelligence platform operations.

## Prompt

**Stand up a GraphQL gateway that supports persisted queries, cost estimation/limits, field-level authz, and partial-results with hints. Add token-bucket rate control per tenant and signed webhooks with DLQ. Provide SDK stubs (TS/Java/Python) and contract tests.**

### Core Requirements

**(a) Persisted Queries**

Security and performance via allow-listed queries:

```typescript
interface PersistedQuery {
  hash: string;  // SHA-256 of query
  query: string;
  operationName: string;
  createdAt: Date;
  deprecated: boolean;
}

// Store persisted queries
const persistedQueries = new Map<string, PersistedQuery>();

// Build persisted query manifest
async function buildPersistedQueryManifest(): Promise<void> {
  const queries = await loadQueriesFromFiles('queries/**/*.graphql');

  for (const query of queries) {
    const hash = sha256(query.query);
    persistedQueries.set(hash, {
      hash,
      query: query.query,
      operationName: query.operationName,
      createdAt: new Date(),
      deprecated: false
    });
  }

  // Write manifest
  await fs.writeFile(
    'persisted-queries.json',
    JSON.stringify(Array.from(persistedQueries.values()))
  );
}

// Apollo Server plugin
const persistedQueryPlugin: ApolloServerPlugin = {
  async requestDidStart({ request }) {
    if (request.extensions?.persistedQuery) {
      const { sha256Hash } = request.extensions.persistedQuery;

      // Lookup query
      const persisted = persistedQueries.get(sha256Hash);

      if (!persisted) {
        throw new GraphQLError('Persisted query not found', {
          extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' }
        });
      }

      if (persisted.deprecated) {
        console.warn(`Deprecated persisted query used: ${sha256Hash}`);
      }

      // Inject query
      request.query = persisted.query;
    } else {
      // Require persisted queries in production
      if (process.env.NODE_ENV === 'production') {
        throw new GraphQLError('Only persisted queries allowed in production', {
          extensions: { code: 'PERSISTED_QUERY_REQUIRED' }
        });
      }
    }
  }
};

// Client usage
const client = new ApolloClient({
  link: createPersistedQueryLink({ sha256 }).concat(httpLink),
  cache: new InMemoryCache()
});

// Query by hash
const { data } = await client.query({
  query: GET_ENTITIES,  // Will be sent as hash only
  variables: { limit: 10 }
});
```

**(b) Cost Estimation & Limits**

Prevent expensive queries:

```typescript
interface QueryCost {
  totalCost: number;
  breakdown: {
    [field: string]: number;
  };
  estimatedMs: number;
}

interface CostAnalyzer {
  // Estimate query cost before execution
  estimate(query: DocumentNode, variables: any): QueryCost;

  // Check if query within limit
  withinLimit(cost: QueryCost, userLimit: number): boolean;
}

// Cost rules
const costRules = {
  // Base costs
  Query: 1,
  Mutation: 10,

  // Field costs
  'Entity.relationships': (args) => args.limit || 100,  // Cost = # relationships fetched
  'Investigation.entities': (args) => args.limit || 100,
  'Entity.relatedEntities': (args) => (args.depth || 1) * 50,  // Exponential cost for deep traversal

  // Multipliers
  complexity_multiplier: (depth) => Math.pow(2, depth - 1)
};

class CostAnalyzerImpl implements CostAnalyzer {
  estimate(query: DocumentNode, variables: any): QueryCost {
    const breakdown: Record<string, number> = {};
    let totalCost = 0;

    visit(query, {
      Field(node, key, parent, path, ancestors) {
        const fieldName = node.name.value;
        const parentType = ancestors[ancestors.length - 1];

        const costKey = `${parentType}.${fieldName}`;
        const costFn = costRules[costKey];

        if (costFn) {
          const args = node.arguments?.reduce((acc, arg) => {
            acc[arg.name.value] = variables[arg.value];
            return acc;
          }, {});

          const cost = typeof costFn === 'function' ? costFn(args) : costFn;
          breakdown[costKey] = (breakdown[costKey] || 0) + cost;
          totalCost += cost;
        }
      }
    });

    return {
      totalCost,
      breakdown,
      estimatedMs: totalCost * 10  // Estimate 10ms per cost unit
    };
  }

  withinLimit(cost: QueryCost, userLimit: number): boolean {
    return cost.totalCost <= userLimit;
  }
}

// Apollo Server plugin
const costLimitPlugin: ApolloServerPlugin = {
  async requestDidStart({ request, contextValue }) {
    const costAnalyzer = new CostAnalyzerImpl();
    const cost = costAnalyzer.estimate(parse(request.query), request.variables);

    const userLimit = contextValue.user.queryComplexityLimit || 1000;

    if (!costAnalyzer.withinLimit(cost, userLimit)) {
      throw new GraphQLError(
        `Query cost ${cost.totalCost} exceeds limit ${userLimit}`,
        {
          extensions: {
            code: 'COST_LIMIT_EXCEEDED',
            cost: cost.totalCost,
            limit: userLimit,
            breakdown: cost.breakdown
          }
        }
      );
    }
  }
};
```

**(c) Field-Level Authorization**

Enforce permissions at field granularity:

```typescript
interface FieldAuthzDirective {
  // @requiresRole(role: "ADMIN")
  requiresRole?: string[];

  // @requiresClearance(level: "SECRET")
  requiresClearance?: string;

  // @requiresPolicy(policy: "entity:read")
  requiresPolicy?: string;
}

// GraphQL schema
type Entity {
  id: ID!
  name: String!
  classification: String! @requiresClearance(level: "SECRET")
  financialData: FinancialData @requiresRole(roles: ["ANALYST", "ADMIN"])
  provenance: ProvenanceChain @requiresPolicy(policy: "provenance:read")
}

// Field resolver wrapper
function fieldAuthzResolver(
  directive: FieldAuthzDirective,
  next: GraphQLFieldResolver
): GraphQLFieldResolver {
  return async (parent, args, context, info) => {
    // Check role
    if (directive.requiresRole) {
      if (!directive.requiresRole.some(role => context.user.roles.includes(role))) {
        return null;  // Field filtered out
      }
    }

    // Check clearance
    if (directive.requiresClearance) {
      if (!hasClearance(context.user, directive.requiresClearance)) {
        return null;
      }
    }

    // Check policy
    if (directive.requiresPolicy) {
      const allowed = await context.policyEngine.evaluate(directive.requiresPolicy, context.user);
      if (!allowed) {
        return null;
      }
    }

    // Authorized, proceed
    return next(parent, args, context, info);
  };
}

// Apply directive
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: {
    requiresRole: FieldAuthzDirective,
    requiresClearance: FieldAuthzDirective,
    requiresPolicy: FieldAuthzDirective
  }
});
```

**(d) Partial Results with Hints**

Return partial data with explanations:

```typescript
interface PartialResult {
  data: any;
  partial: boolean;
  hints: ResultHint[];
}

interface ResultHint {
  path: string[];  // Path to field
  reason: 'unauthorized' | 'error' | 'timeout' | 'rate_limited';
  message: string;
}

// Format response
function formatPartialResponse(result: ExecutionResult): PartialResult {
  const hints: ResultHint[] = [];
  let partial = false;

  // Check for null fields
  visit(result.data, {
    enter(node, key, parent, path) {
      if (node === null && parent !== null) {
        // Field was filtered (likely authz)
        hints.push({
          path,
          reason: 'unauthorized',
          message: 'Field filtered due to insufficient permissions'
        });
        partial = true;
      }
    }
  });

  // Check for errors
  if (result.errors) {
    for (const error of result.errors) {
      hints.push({
        path: error.path || [],
        reason: error.extensions?.code === 'TIMEOUT' ? 'timeout' : 'error',
        message: error.message
      });
      partial = true;
    }
  }

  return {
    data: result.data,
    partial,
    hints
  };
}

// Example response
{
  "data": {
    "entity": {
      "id": "e-123",
      "name": "Public Entity",
      "classification": null,  // Filtered
      "financialData": null    // Filtered
    }
  },
  "partial": true,
  "hints": [
    {
      "path": ["entity", "classification"],
      "reason": "unauthorized",
      "message": "Requires SECRET clearance"
    },
    {
      "path": ["entity", "financialData"],
      "reason": "unauthorized",
      "message": "Requires ANALYST role"
    }
  ]
}
```

**(e) Token-Bucket Rate Limiting**

Per-tenant rate control:

```typescript
interface RateLimiter {
  // Check if request allowed
  checkLimit(key: string): Promise<RateLimitResult>;

  // Record request
  recordRequest(key: string): Promise<void>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// Token bucket implementation (Redis)
class TokenBucketRateLimiter implements RateLimiter {
  private redis: Redis;
  private bucketSize: number;
  private refillRate: number;  // tokens/second

  async checkLimit(key: string): Promise<RateLimitResult> {
    const now = Date.now() / 1000;

    // Get bucket state
    const bucket = await this.redis.hgetall(`ratelimit:${key}`);
    let tokens = parseFloat(bucket.tokens || this.bucketSize);
    let lastRefill = parseFloat(bucket.lastRefill || now);

    // Refill tokens
    const elapsed = now - lastRefill;
    tokens = Math.min(this.bucketSize, tokens + elapsed * this.refillRate);

    if (tokens >= 1) {
      return {
        allowed: true,
        remaining: Math.floor(tokens - 1),
        resetAt: new Date((now + (this.bucketSize - tokens) / this.refillRate) * 1000)
      };
    } else {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date((now + (1 - tokens) / this.refillRate) * 1000)
      };
    }
  }

  async recordRequest(key: string): Promise<void> {
    const now = Date.now() / 1000;

    // Consume token
    await this.redis.eval(`
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local bucketSize = tonumber(ARGV[2])
      local refillRate = tonumber(ARGV[3])

      local bucket = redis.call('HGETALL', key)
      local tokens = tonumber(bucket[2] or bucketSize)
      local lastRefill = tonumber(bucket[4] or now)

      local elapsed = now - lastRefill
      tokens = math.min(bucketSize, tokens + elapsed * refillRate)

      tokens = tokens - 1

      redis.call('HSET', key, 'tokens', tokens, 'lastRefill', now)
      redis.call('EXPIRE', key, 3600)

      return tokens
    `, 1, `ratelimit:${key}`, now, this.bucketSize, this.refillRate);
  }
}

// Apollo Server plugin
const rateLimitPlugin: ApolloServerPlugin = {
  async requestDidStart({ request, contextValue }) {
    const key = `user:${contextValue.user.id}`;
    const result = await rateLimiter.checkLimit(key);

    if (!result.allowed) {
      throw new GraphQLError('Rate limit exceeded', {
        extensions: {
          code: 'RATE_LIMIT_EXCEEDED',
          resetAt: result.resetAt.toISOString()
        }
      });
    }

    await rateLimiter.recordRequest(key);

    // Add headers
    contextValue.res.setHeader('X-RateLimit-Remaining', result.remaining);
    contextValue.res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
  }
};
```

**(f) Signed Webhooks with DLQ**

Reliable event delivery:

```typescript
interface Webhook {
  id: string;
  url: string;
  events: string[];  // e.g., ['entity.created', 'investigation.updated']
  secret: string;  // For HMAC signing
  enabled: boolean;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  signature: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'delivered' | 'failed';
  nextRetryAt?: Date;
}

// Sign payload
function signPayload(payload: any, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Deliver webhook
async function deliverWebhook(
  webhook: Webhook,
  event: string,
  payload: any
): Promise<void> {
  const delivery: WebhookDelivery = {
    id: uuidv4(),
    webhookId: webhook.id,
    event,
    payload,
    signature: signPayload(payload, webhook.secret),
    attempts: 0,
    maxAttempts: 5,
    status: 'pending'
  };

  await webhookQueue.enqueue(delivery);
}

// Webhook worker
async function processWebhookQueue(): Promise<void> {
  while (true) {
    const delivery = await webhookQueue.dequeue();
    const webhook = await getWebhook(delivery.webhookId);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${delivery.signature}`,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery-ID': delivery.id
        },
        body: JSON.stringify(delivery.payload),
        timeout: 10000
      });

      if (response.ok) {
        delivery.status = 'delivered';
        await webhookDeliveryDb.update(delivery);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      delivery.attempts++;

      if (delivery.attempts >= delivery.maxAttempts) {
        // Move to DLQ
        delivery.status = 'failed';
        await deadLetterQueue.enqueue(delivery);
      } else {
        // Retry with exponential backoff
        delivery.nextRetryAt = new Date(Date.now() + Math.pow(2, delivery.attempts) * 1000);
        await webhookQueue.enqueue(delivery, delivery.nextRetryAt);
      }

      await webhookDeliveryDb.update(delivery);
    }
  }
}

// Verify signature (client-side)
function verifySignature(payload: any, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

**(g) Client SDKs**

Generated SDKs for common languages:

```bash
# Generate TypeScript SDK
graphql-codegen --config codegen.yml

# Generate Java SDK
apollo client:codegen \
  --target=java \
  --outputDir=./clients/java

# Generate Python SDK
ariadne-codegen
```

**TypeScript SDK**:
```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';

const client = new ApolloClient({
  link: createPersistedQueryLink({ sha256 }).concat(httpLink),
  cache: new InMemoryCache()
});

// Usage
const { data } = await client.query({
  query: GET_ENTITIES,
  variables: { limit: 10 }
});
```

**(h) Contract Tests**

Ensure API contract stability:

```typescript
// tests/contract/entities.test.ts
describe('Entities API Contract', () => {
  it('should return entities with required fields', async () => {
    const { data } = await client.query({
      query: gql`
        query GetEntities {
          entities(limit: 10) {
            id
            name
            type
          }
        }
      `
    });

    expect(data.entities).toBeDefined();
    expect(data.entities.length).toBeLessThanOrEqual(10);

    for (const entity of data.entities) {
      expect(entity).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String)
      });
    }
  });

  it('should enforce field-level authz', async () => {
    // Low-clearance user
    const { data } = await lowClearanceClient.query({
      query: gql`
        query GetClassifiedEntity($id: ID!) {
          entity(id: $id) {
            id
            name
            classification
          }
        }
      `,
      variables: { id: 'e-classified-123' }
    });

    expect(data.entity.id).toBeDefined();
    expect(data.entity.name).toBeDefined();
    expect(data.entity.classification).toBeNull();  // Filtered
  });
});
```

### Deliverables Checklist

- [x] GraphQL gateway service (Apollo Server)
- [x] Persisted query system
- [x] Cost analyzer and limiter
- [x] Field-level authz directives
- [x] Partial result formatter
- [x] Token-bucket rate limiter (Redis)
- [x] Webhook delivery system with DLQ
- [x] Client SDKs (TypeScript, Java, Python)
- [x] Contract test suite
- [x] API documentation (GraphQL Playground)
- [x] Integration guide

### Acceptance Criteria

1. **Persisted Queries**
   - [ ] Build query manifest
   - [ ] Execute query by hash
   - [ ] Verify production rejects non-persisted

2. **Cost Limits**
   - [ ] Execute expensive query
   - [ ] Verify cost computed
   - [ ] Exceed limit → blocked

3. **Field-Level Authz**
   - [ ] Request unauthorized field
   - [ ] Verify field null
   - [ ] Check hint explains filtering

4. **Rate Limiting**
   - [ ] Send 100 requests/second
   - [ ] Verify rate limited
   - [ ] Check 429 response

5. **Webhooks**
   - [ ] Create webhook subscription
   - [ ] Trigger event
   - [ ] Verify signed delivery
   - [ ] Simulate failure → DLQ

## Implementation Notes

### Persisted Query Workflow

1. **Development**: Write queries in `.graphql` files
2. **Build**: Generate manifest (`pnpm persisted:build`)
3. **Deploy**: Upload manifest to gateway
4. **Client**: Use persisted query link

### Cost Estimation Accuracy

- Profile queries in staging
- Tune cost rules based on actual execution time
- Monitor `estimated_ms` vs `actual_ms`

### Webhook Reliability

- Idempotent handlers (use `X-Webhook-Delivery-ID`)
- Exponential backoff (1s, 2s, 4s, 8s, 16s)
- DLQ for manual review

## References

- [Apollo Persisted Queries](https://www.apollographql.com/docs/apollo-server/performance/apq/)
- [GraphQL Cost Analysis](https://github.com/pa-bru/graphql-cost-analysis)

## Related Prompts

- **FIN-001**: Cost-Guard (integrate with cost tracking)
- **GOV-001**: Policy Simulator (test authz policies)
- **MIG-001**: Migration Verifier (STIX/TAXII gateway adapter)
