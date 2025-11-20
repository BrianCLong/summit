# GraphQL Schema Governance and Validation

Comprehensive GraphQL schema governance, validation, and evolution system for IntelGraph.

## Features

- ✅ **Schema Registry**: Version control for all schema changes with automatic diffing
- ✅ **Validation Rules**: Comprehensive validation for naming, anti-patterns, and best practices
- ✅ **Field-Level Authorization**: RBAC with @auth, @rateLimit, and @budget directives
- ✅ **Query Complexity Analysis**: Prevent expensive queries with depth and complexity limits
- ✅ **Federation Support**: Apollo Federation with multiple subgraphs
- ✅ **Performance Monitoring**: Track resolver performance and detect N+1 queries
- ✅ **Documentation Generator**: Auto-generate docs in Markdown, HTML, or JSON
- ✅ **CI/CD Integration**: Automated schema validation in GitHub Actions
- ✅ **GraphQL Playground**: Interactive playground with authentication

## Quick Start

### 1. Initialize Schema Registry

```typescript
import { schemaRegistry } from './graphql/schema-registry';

// Initialize the registry
await schemaRegistry.initialize();

// Register initial schema version
await schemaRegistry.registerSchema(
  schemaString,
  'v1.0.0',
  'developer@example.com',
  'Initial schema version'
);
```

### 2. Validate Schema

```typescript
import { buildSchema } from 'graphql';
import { validateSchema } from './graphql/validation-rules';

const schema = buildSchema(schemaString);
const result = validateSchema(schema);

if (!result.valid) {
  console.error('Schema validation failed:');
  result.errors.forEach(err => console.error(`- ${err.message}`));
}
```

### 3. Add Authorization Directives

```typescript
import { authDirective, rateLimitDirective } from './graphql/directives/auth';
import { makeExecutableSchema } from '@graphql-tools/schema';

const { typeDefs: authTypeDefs, transformer: authTransformer } = authDirective();
const { typeDefs: rateLimitTypeDefs, transformer: rateLimitTransformer } = rateLimitDirective();

let schema = makeExecutableSchema({
  typeDefs: [authTypeDefs, rateLimitTypeDefs, mainTypeDefs],
  resolvers,
});

schema = authTransformer(schema);
schema = rateLimitTransformer(schema);
```

### 4. Enable Complexity Limits

```typescript
import { createComplexityLimitRule, createDepthLimitRule } from './graphql/complexity-calculator';

const server = new ApolloServer({
  schema,
  validationRules: [
    createComplexityLimitRule({ maxComplexity: 1000, maxDepth: 10 }),
    createDepthLimitRule(10),
  ],
});
```

### 5. Add Performance Monitoring

```typescript
import { globalPerformanceMonitor, createPerformanceMonitoringPlugin } from './graphql/performance-monitor';

const server = new ApolloServer({
  schema,
  plugins: [
    createPerformanceMonitoringPlugin(globalPerformanceMonitor),
  ],
});
```

### 6. Generate Documentation

```typescript
import { generateDocumentation } from './graphql/documentation-generator';

await generateDocumentation(schema, {
  outputPath: './docs/graphql/api-docs.md',
  format: 'markdown',
  includeExamples: true,
});
```

## Directory Structure

```
graphql/
├── schema-registry.ts           # Schema versioning and change tracking
├── validation-rules.ts          # Schema validation rules
├── complexity-calculator.ts     # Query complexity analysis
├── performance-monitor.ts       # Performance tracking and N+1 detection
├── documentation-generator.ts   # Auto-generate documentation
├── playground.html              # Authenticated GraphQL Playground
├── directives/
│   └── auth.ts                 # Authorization directives
├── federation/
│   ├── gateway.ts              # Apollo Gateway setup
│   └── subgraph.ts             # Subgraph utilities
├── versions/                    # Schema version history
│   ├── v1.0.0.json
│   ├── v1.0.0.graphql
│   └── ...
└── README.md                    # This file
```

## Schema Directives

### @auth

Protect fields with authentication and authorization:

```graphql
type Query {
  # Requires authentication
  user(id: ID!): User @auth

  # Requires specific role
  adminPanel: AdminPanel @auth(roles: ["admin"])

  # Requires permissions
  deleteUser(id: ID!): Boolean! @auth(permissions: ["delete:users"])

  # Requires ownership
  myProfile: User @auth(requireOwnership: true, ownerField: "userId")
}
```

### @rateLimit

Rate limit expensive operations:

```graphql
type Mutation {
  generateInsights(entityId: ID!): EntityInsights!
    @rateLimit(max: 10, window: 60, scope: USER)
}
```

### @budget

Enforce token and cost limits on AI operations:

```graphql
type Mutation {
  analyzeText(text: String!): Analysis!
    @budget(capUSD: 0.50, tokenCeiling: 1000, provider: "openai")
}
```

### @deprecated

Mark fields for deprecation with migration path:

```graphql
type Entity {
  oldField: String @deprecated(
    reason: "Use newField instead. Will be removed on 2025-12-31."
    removeBy: "2025-12-31"
    replaceWith: "newField"
  )
  newField: String!
}
```

## Validation Rules

The schema validator checks for:

### Naming Conventions
- **Types**: PascalCase (e.g., `UserProfile`)
- **Fields**: camelCase (e.g., `firstName`)
- **Enums**: UPPER_CASE (e.g., `ACTIVE`)
- **Inputs**: Must end with `Input`

### Anti-Patterns
- Generic field names (`data`, `info`, `value`)
- List fields without pagination
- Too many fields (>50) or arguments (>10)
- Deeply nested lists

### Deprecations
- Must have clear reason (≥10 characters)
- Should include migration path
- Should specify removal date

## Query Complexity

### Configuration

```typescript
const config = {
  maxComplexity: 1000,      // Maximum query complexity
  maxDepth: 10,             // Maximum nesting depth
  defaultComplexity: 1,     // Default field cost
  listMultiplier: 10,       // Multiplier for list fields
};
```

### Custom Complexity

```typescript
import { paginatedComplexity, searchComplexity } from './graphql/complexity-calculator';

// Paginated field
customComplexity.set('Query.entities', paginatedComplexity(2));

// Search field (more expensive)
customComplexity.set('Query.semanticSearch', searchComplexity(10));

// Custom calculator
customComplexity.set('Query.customField', (args, childComplexity) => {
  const multiplier = args.includeExpensive ? 5 : 1;
  return (baseComplexity + childComplexity) * multiplier;
});
```

## Performance Monitoring

### Metrics Tracked

- Resolver execution time
- N+1 query detection
- Query complexity scores
- Field usage statistics

### Example Usage

```typescript
// Get performance report
const report = globalPerformanceMonitor.generateReport();

console.log(`Total execution time: ${report.totalExecutionTime}ms`);
console.log(`Slow resolvers: ${report.slowResolvers.length}`);
console.log(`N+1 queries: ${report.nPlusOneQueries.length}`);

// Log report
console.log(formatPerformanceReport(report));
```

### Preventing N+1 Queries

Use DataLoader for batching:

```typescript
import { createDataLoaderContext } from './graphql/performance-monitor';

const context = createDataLoaderContext({
  user: req.user,
  db: dbClient,
});

// In resolver - automatically batched!
const entity = await context.loaders.entity.load(entityId);
```

## Federation

### Gateway Setup

```typescript
import { createFederatedGateway, defaultSubgraphs } from './graphql/federation/gateway';

const gateway = await createFederatedGateway({
  subgraphs: defaultSubgraphs,
  pollIntervalMs: 30000,
  debug: process.env.NODE_ENV !== 'production',
});
```

### Creating a Subgraph

```typescript
import { createSubgraphSchema } from './graphql/federation/subgraph';

const schema = createSubgraphSchema(typeDefs, {
  Query: {
    entity: (_, { id }, { dataSources }) => dataSources.entities.findById(id),
  },
  Entity: {
    __resolveReference: (ref, { dataSources }) => dataSources.entities.findById(ref.id),
  },
});
```

## CI/CD Integration

The GitHub Actions workflow automatically runs on every PR:

1. ✅ Validates schema syntax
2. ✅ Checks for breaking changes
3. ✅ Runs validation rules
4. ✅ Verifies naming conventions
5. ✅ Validates deprecations
6. ✅ Checks for anti-patterns
7. ✅ Generates complexity report
8. ✅ Creates changelog
9. ✅ Posts results to PR

### Running Locally

```bash
# Validate schema
node -e "require('./dist/graphql/validation-rules').validateSchema(schema)"

# Check for breaking changes
node tools/graphql/schema-check.mjs

# Generate documentation
node -e "require('./dist/graphql/documentation-generator').generateDocumentation(...)"
```

## GraphQL Playground

Access the authenticated playground at:

```
http://localhost:4000/playground
```

Features:
- 🔐 Authentication required
- 📝 Pre-loaded example queries
- 🎨 Dark theme
- ⚡ Auto-completion
- 📊 Performance metrics in response

## Documentation Generation

Generate documentation in multiple formats:

### Markdown

```typescript
await generateDocumentation(schema, {
  outputPath: './docs/api-docs.md',
  format: 'markdown',
  includeExamples: true,
  includeDeprecated: false,
});
```

### HTML

```typescript
await generateDocumentation(schema, {
  outputPath: './docs/api-docs.html',
  format: 'html',
  includeExamples: true,
});
```

### JSON

```typescript
await generateDocumentation(schema, {
  outputPath: './docs/api-docs.json',
  format: 'json',
});
```

## Best Practices

### 1. Always Validate Before Registering

```typescript
const validation = await schemaRegistry.validateCanRegister(newSchema);
if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
  return;
}
```

### 2. Use Pagination for Lists

```graphql
type Query {
  entities(limit: Int = 25, offset: Int = 0): [Entity!]!
}
```

### 3. Document Everything

```graphql
"""
Entity in the knowledge graph.
"""
type Entity {
  """Unique identifier"""
  id: ID!
}
```

### 4. Protect Expensive Operations

```graphql
type Mutation {
  expensiveOperation: Result!
    @auth
    @rateLimit(max: 5, window: 60)
    @budget(capUSD: 1.0)
}
```

### 5. Monitor Performance

```typescript
// Check for issues after each request
const report = globalPerformanceMonitor.generateReport();
if (report.nPlusOneQueries.length > 0) {
  logger.warn('N+1 queries detected', { queries: report.nPlusOneQueries });
}
```

## Migration Guide

See [SCHEMA_GOVERNANCE.md](../docs/graphql/SCHEMA_GOVERNANCE.md) for detailed migration guidelines.

## Support

- **Documentation**: [docs/graphql/](../docs/graphql/)
- **Examples**: [examples/](./examples/)
- **Issues**: https://github.com/intelgraph/api/issues
- **Slack**: #graphql-api

## License

MIT
