# GraphQL Schema Governance Migration Guide

This guide helps you integrate the GraphQL Schema Governance system into your existing IntelGraph project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Initial Setup](#initial-setup)
4. [Migrating Existing Schema](#migrating-existing-schema)
5. [Integrating with Apollo Server](#integrating-with-apollo-server)
6. [CI/CD Integration](#cicd-integration)
7. [Updating Resolvers](#updating-resolvers)
8. [Testing](#testing)
9. [Rollback Plan](#rollback-plan)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the migration:

- **Node.js**: Version 18.18 or higher
- **TypeScript**: Version 5.3.3 or higher
- **GraphQL**: Version 16.x or higher
- **Existing Apollo Server**: Version 4.x recommended

## Installation

### 1. Install Required Dependencies

```bash
# Install GraphQL governance dependencies
pnpm add @graphql-inspector/core @graphql-tools/utils graphql

# Install dev dependencies for testing
pnpm add -D @types/node jest ts-jest @swc/jest
```

### 2. Verify Installation

```bash
# Check versions
pnpm list @graphql-inspector/core @graphql-tools/utils

# Should output:
# @graphql-inspector/core: ^x.x.x
# @graphql-tools/utils: ^x.x.x
```

## Initial Setup

### 1. Initialize Schema Registry

Create a setup script `scripts/init-schema-governance.ts`:

```typescript
import { schemaRegistry } from '../graphql/schema-registry';
import { buildSchema } from 'graphql';
import * as fs from 'fs/promises';

async function initializeGovernance() {
  console.log('🚀 Initializing GraphQL Schema Governance...\n');

  // 1. Initialize registry
  await schemaRegistry.initialize();
  console.log('✅ Registry initialized');

  // 2. Register current schema as v1.0.0
  const currentSchema = await fs.readFile('./graphql/schema.graphql', 'utf-8');

  const version = await schemaRegistry.registerSchema(
    currentSchema,
    'v1.0.0',
    process.env.USER || 'system',
    'Initial schema baseline',
    { tags: ['baseline'] }
  );

  console.log(`✅ Registered current schema as ${version.version}`);
  console.log(`   Hash: ${version.hash}`);
  console.log(`   Timestamp: ${version.timestamp.toISOString()}\n`);

  // 3. Validate schema
  const { validateSchema } = await import('../graphql/validation-rules');
  const schema = buildSchema(currentSchema);
  const validation = validateSchema(schema);

  if (!validation.valid) {
    console.log('⚠️  Schema validation warnings:');
    validation.errors.forEach(err => console.log(`   - ${err.message}`));
    console.log('');
  } else {
    console.log('✅ Schema validation passed\n');
  }

  // 4. Show stats
  const stats = schemaRegistry.getStats();
  console.log('📊 Registry Statistics:');
  console.log(`   Total Versions: ${stats.totalVersions}`);
  console.log(`   Latest Version: ${stats.latestVersion}`);
  console.log(`   Total Changes: ${stats.totalChanges}\n`);

  console.log('✨ Setup complete! You can now use schema governance.\n');
}

initializeGovernance().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
```

Run the initialization:

```bash
pnpm tsx scripts/init-schema-governance.ts
```

### 2. Create Baseline Schema File

If you don't have a single `schema.graphql` file, create one:

```bash
# Export current schema to baseline
mkdir -p graphql
touch graphql/schema.graphql

# Copy your existing schema definition
# (from server/src/graphql/schema.ts or similar)
```

## Migrating Existing Schema

### Step 1: Extract Current Schema

If your schema is currently defined in TypeScript:

**Before** (`server/src/graphql/schema.ts`):
```typescript
export const typeDefs = `
  type Query {
    user(id: ID!): User
  }
  type User {
    id: ID!
    name: String!
  }
`;
```

**After** (`graphql/schema.graphql`):
```graphql
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
}
```

Update TypeScript to import:
```typescript
import { readFileSync } from 'fs';

export const typeDefs = readFileSync('./graphql/schema.graphql', 'utf-8');
```

### Step 2: Register Baseline

```bash
node -e "
const { schemaRegistry } = require('./dist/graphql/schema-registry');
const fs = require('fs');

(async () => {
  await schemaRegistry.initialize();
  const schema = fs.readFileSync('./graphql/schema.graphql', 'utf-8');
  await schemaRegistry.registerSchema(schema, 'v1.0.0', 'migration', 'Baseline from migration');
})();
"
```

### Step 3: Validate No Breaking Changes

Before deploying, validate your current schema:

```bash
node -e "
const { schemaRegistry } = require('./dist/graphql/schema-registry');
const fs = require('fs');

(async () => {
  await schemaRegistry.initialize();
  const schema = fs.readFileSync('./graphql/schema.graphql', 'utf-8');
  const result = await schemaRegistry.validateCanRegister(schema);

  if (!result.valid) {
    console.error('Validation failed:', result.errors);
    process.exit(1);
  }
  console.log('✅ Schema is valid');
})();
"
```

## Integrating with Apollo Server

### Step 1: Add Governance to Server

**Before** (`server/src/graphql/index.ts`):
```typescript
import { ApolloServer } from '@apollo/server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});
```

**After** (`server/src/graphql/index.ts`):
```typescript
import { ApolloServer } from '@apollo/server';
import { buildSchema } from 'graphql';
import { readFileSync } from 'fs';

// Import governance components
import { validateSchema } from '../../graphql/validation-rules';
import {
  createComplexityLimitRule,
  createDepthLimitRule,
  defaultComplexityConfig
} from '../../graphql/complexity-calculator';
import {
  globalPerformanceMonitor,
  createPerformanceMonitoringPlugin
} from '../../graphql/performance-monitor';
import { authDirective, rateLimitDirective } from '../../graphql/directives/auth';

// Load and validate schema
const typeDefs = readFileSync('./graphql/schema.graphql', 'utf-8');
const schema = buildSchema(typeDefs);
const validation = validateSchema(schema);

if (!validation.valid) {
  console.error('Schema validation failed:', validation.errors);
  throw new Error('Invalid schema');
}

// Apply directives
const { typeDefs: authTypeDefs } = authDirective();
const { typeDefs: rateLimitTypeDefs } = rateLimitDirective();

const server = new ApolloServer({
  typeDefs: [authTypeDefs, rateLimitTypeDefs, typeDefs],
  resolvers,

  // Add complexity limits
  validationRules: [
    createComplexityLimitRule(defaultComplexityConfig),
    createDepthLimitRule(10),
  ],

  // Add performance monitoring
  plugins: [
    createPerformanceMonitoringPlugin(globalPerformanceMonitor),
  ],

  introspection: process.env.NODE_ENV !== 'production',
});
```

### Step 2: Update Context Creation

Add authorization context:

```typescript
import { createAuthContext } from '../../graphql/directives/auth';
import { createDataLoaderContext } from '../../graphql/performance-monitor';

app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      const baseContext = {
        user: (req as any).user, // From auth middleware
        db: dbClient,
      };

      return {
        ...createAuthContext(baseContext),
        ...createDataLoaderContext(baseContext),
        requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      };
    },
  })
);
```

### Step 3: Add Authorization to Schema

Update your schema to include auth directives:

**Before**:
```graphql
type Query {
  users: [User!]!
  user(id: ID!): User
}
```

**After**:
```graphql
type Query {
  # Public query
  user(id: ID!): User

  # Requires authentication
  users: [User!]! @auth

  # Requires specific role
  adminPanel: AdminPanel @auth(roles: ["admin"])
}
```

## CI/CD Integration

### Step 1: Add to GitHub Actions

The workflow is already created at `.github/workflows/graphql-validation.yml`. Enable it:

```bash
# Ensure workflow file exists
ls -la .github/workflows/graphql-validation.yml

# Commit and push
git add .github/workflows/graphql-validation.yml
git commit -m "ci: add GraphQL schema validation"
git push
```

### Step 2: Update Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "graphql:validate": "tsx scripts/validate-schema.ts",
    "graphql:check": "node tools/graphql/schema-check.mjs",
    "graphql:docs": "tsx scripts/generate-docs.ts",
    "graphql:register": "tsx scripts/register-schema.ts",
    "precommit": "pnpm graphql:validate && lint-staged"
  }
}
```

### Step 3: Create Validation Script

Create `scripts/validate-schema.ts`:

```typescript
import { buildSchema } from 'graphql';
import { readFileSync } from 'fs';
import { validateSchema } from '../graphql/validation-rules';

const schema = buildSchema(readFileSync('./graphql/schema.graphql', 'utf-8'));
const result = validateSchema(schema);

console.log('\n📋 Schema Validation Results\n');

if (result.errors.length > 0) {
  console.log('❌ Errors:');
  result.errors.forEach(err => {
    console.log(`  - [${err.rule}] ${err.message}`);
    if (err.suggestion) console.log(`    💡 ${err.suggestion}`);
  });
}

if (result.warnings && result.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(warn => {
    console.log(`  - [${warn.rule}] ${warn.message}`);
  });
}

if (result.valid && result.warnings?.length === 0) {
  console.log('✅ No issues found!\n');
}

process.exit(result.valid ? 0 : 1);
```

## Updating Resolvers

### Add Performance Monitoring

**Before**:
```typescript
const resolvers = {
  Query: {
    users: async () => {
      return await db.users.findMany();
    },
  },
};
```

**After** (with DataLoader to prevent N+1):
```typescript
const resolvers = {
  Query: {
    users: async (_, __, context) => {
      // Uses DataLoader automatically
      return await context.loaders.users.loadMany(ids);
    },
  },

  User: {
    posts: async (user, _, context) => {
      // Batched loading prevents N+1
      return await context.loaders.postsByUser.load(user.id);
    },
  },
};
```

### Add Rate Limiting

For expensive operations, add rate limiting:

```graphql
type Mutation {
  generateReport(input: ReportInput!): Report!
    @auth(roles: ["analyst", "admin"])
    @rateLimit(max: 5, window: 60, scope: USER)
}
```

## Testing

### Step 1: Run Unit Tests

```bash
# Run all GraphQL governance tests
pnpm test graphql/__tests__

# Run specific test file
pnpm test schema-registry.test.ts

# Run with coverage
pnpm test --coverage graphql/__tests__
```

### Step 2: Integration Testing

Create `tests/integration/graphql-governance.test.ts`:

```typescript
import { ApolloServer } from '@apollo/server';
import { schemaRegistry } from '../../graphql/schema-registry';

describe('GraphQL Governance Integration', () => {
  beforeAll(async () => {
    await schemaRegistry.initialize();
  });

  test('should enforce complexity limits', async () => {
    // Test that complex queries are rejected
    const result = await server.executeOperation({
      query: `
        query ComplexQuery {
          users {
            posts {
              comments {
                author {
                  posts {
                    comments {
                      # Too deep!
                    }
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('depth');
  });

  test('should enforce authorization', async () => {
    const result = await server.executeOperation(
      {
        query: `query { users { id email } }`,
      },
      {
        contextValue: { user: null }, // No user
      }
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('Authentication required');
  });
});
```

### Step 3: Load Testing

Test with K6:

```javascript
// load/k6/graphql-governance.js
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query: '{ users(limit: 10) { id name } }',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.AUTH_TOKEN}`,
      },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no errors': (r) => !JSON.parse(r.body).errors,
    'has performance data': (r) => {
      const body = JSON.parse(r.body);
      return body.extensions && body.extensions.performance;
    },
  });
}
```

Run: `k6 run load/k6/graphql-governance.js`

## Rollback Plan

If you need to rollback the changes:

### Quick Rollback

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Remove governance files (if needed)
rm -rf graphql/versions
rm graphql/*.ts

# 3. Restore original server setup
git checkout HEAD~1 -- server/src/graphql/index.ts

# 4. Restart server
pnpm run dev
```

### Gradual Rollback

Remove components one at a time:

1. **Remove CI validation** (least risky):
   ```bash
   git rm .github/workflows/graphql-validation.yml
   ```

2. **Remove complexity limits**:
   ```typescript
   // Remove from Apollo Server config
   validationRules: [], // Remove complexity rules
   ```

3. **Remove auth directives**:
   ```graphql
   # Remove @auth from schema
   type Query {
     users: [User!]! # Remove @auth directive
   }
   ```

4. **Remove registry** (most invasive):
   ```bash
   rm -rf graphql/versions
   rm graphql/schema-registry.ts
   ```

## Troubleshooting

### Issue: "Registry must be initialized before registering schemas"

**Solution**:
```typescript
// Always initialize before use
await schemaRegistry.initialize();
```

### Issue: Schema validation fails with many warnings

**Solution**:
1. Review warnings - they don't block deployment
2. Fix critical issues first (errors)
3. Create issues for warnings to fix incrementally

```bash
# Generate report of issues
pnpm graphql:validate > validation-report.txt
```

### Issue: Breaking changes detected unexpectedly

**Solution**:
1. Review the detected changes:
   ```typescript
   const validation = await schemaRegistry.validateCanRegister(newSchema);
   console.log(validation.breakingChanges);
   ```

2. If changes are intentional:
   ```typescript
   await schemaRegistry.registerSchema(
     newSchema,
     'v2.0.0',
     'author@example.com',
     'Intentional breaking changes',
     { allowBreaking: true }
   );
   ```

3. Update major version number for breaking changes

### Issue: Performance monitoring shows N+1 queries

**Solution**:
1. Check the report:
   ```typescript
   const report = globalPerformanceMonitor.generateReport();
   console.log(formatPerformanceReport(report));
   ```

2. Add DataLoaders:
   ```typescript
   context.loaders.user = new DataLoader(async (ids) => {
     return await db.users.findMany({ where: { id: { in: ids } } });
   });
   ```

### Issue: CI failing on schema validation

**Solution**:
1. Run validation locally:
   ```bash
   pnpm graphql:validate
   ```

2. Fix reported issues

3. Commit fixes:
   ```bash
   git add graphql/schema.graphql
   git commit -m "fix: resolve schema validation issues"
   ```

### Issue: Complexity limits too restrictive

**Solution**:
Adjust limits in `graphql/complexity-calculator.ts`:

```typescript
export const defaultComplexityConfig: ComplexityConfig = {
  maxComplexity: 2000, // Increase from 1000
  maxDepth: 15,        // Increase from 10
  // ...
};
```

## Post-Migration Checklist

- [ ] Schema registry initialized and baseline registered
- [ ] All schema files consolidated into `graphql/schema.graphql`
- [ ] Authorization directives added to sensitive fields
- [ ] Complexity limits configured and tested
- [ ] Performance monitoring enabled
- [ ] CI/CD workflow active and passing
- [ ] Team trained on new schema change process
- [ ] Documentation updated
- [ ] Monitoring dashboards configured
- [ ] Load testing completed successfully

## Next Steps

After successful migration:

1. **Monitor for one week**: Watch for issues in production
2. **Team training**: Ensure all developers understand the new process
3. **Iterate**: Adjust limits and rules based on real usage
4. **Expand**: Add more governance rules as needed
5. **Automate**: Create scripts for common tasks

## Support

For issues or questions:

- **Documentation**: [docs/graphql/SCHEMA_GOVERNANCE.md](./SCHEMA_GOVERNANCE.md)
- **Examples**: `graphql/examples/`
- **Slack**: #graphql-api
- **Email**: api-team@intelgraph.com

---

**Migration Version**: 1.0.0
**Last Updated**: 2025-01-20
**Maintained By**: GraphQL Governance Team
