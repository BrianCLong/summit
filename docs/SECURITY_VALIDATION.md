# Security Validation and Data Sanitization Guide

> **Last Updated**: 2025-11-20
> **Purpose**: Comprehensive guide to data validation, input sanitization, and security best practices in the Summit/IntelGraph platform

## Table of Contents

1. [Overview](#overview)
2. [Validation Architecture](#validation-architecture)
3. [Input Validation](#input-validation)
4. [Sanitization](#sanitization)
5. [SQL/Cypher Injection Prevention](#sqlcypher-injection-prevention)
6. [XSS Prevention](#xss-prevention)
7. [Rate Limiting](#rate-limiting)
8. [Request Size Limits](#request-size-limits)
9. [GraphQL Security](#graphql-security)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

---

## Overview

The Summit platform implements defense-in-depth security through multiple layers of validation and sanitization:

- **Input Validation**: Zod schemas for type-safe validation
- **Sanitization**: XSS and injection prevention
- **Rate Limiting**: Request and bandwidth throttling
- **Size Limits**: Payload and query size restrictions
- **GraphQL Security**: Query complexity and depth limits
- **Audit Logging**: Comprehensive security event tracking

### Security Principles

1. **Never trust user input** - All inputs must be validated and sanitized
2. **Use parameterized queries** - Never interpolate user input into SQL/Cypher
3. **Fail securely** - Default to denying access
4. **Log security events** - Track all validation failures
5. **Defense in depth** - Multiple layers of security

---

## Validation Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│                  User Input                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Request Validation Middleware            │
│  - Size limits                                   │
│  - Content-type validation                       │
│  - Suspicious pattern detection                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Sanitization Middleware                  │
│  - HTML escaping                                 │
│  - XSS removal                                   │
│  - Input size limits                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         GraphQL Validation Plugin                │
│  - Query depth/complexity limits                 │
│  - Input validation                              │
│  - Rate limiting                                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Resolver-Level Validation                │
│  - Zod schema validation                         │
│  - Business rule checks                          │
│  - Permission validation                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Database Query Validation                │
│  - Parameterized queries                         │
│  - Query pattern checking                        │
│  - Tenant isolation                              │
└─────────────────────────────────────────────────┘
```

---

## Input Validation

### Using Zod Schemas

All input validation uses [Zod](https://zod.dev/) for type-safe schema validation.

#### Available Schemas

Located in `server/src/validation/MutationValidators.ts`:

- `TenantIdSchema` - Tenant ID validation
- `EntityIdSchema` - UUID validation for entities
- `EmailSchema` - RFC-compliant email validation
- `URLSchema` - URL with protocol restrictions
- `PaginationSchema` - Limit/offset validation
- `SearchQuerySchema` - Search input validation
- `FileUploadSchema` - File upload validation
- `IPAddressSchema` - IPv4/IPv6 validation
- `PhoneNumberSchema` - E.164 phone numbers
- `DateRangeSchema` - Date range validation
- `GraphQLInputSchema` - GraphQL query validation

#### Basic Usage

```typescript
import { EntityIdSchema, validateInput } from '../validation';

// In a GraphQL resolver
async function getEntity(parent, args, context) {
  // Validate entity ID
  const entityId = validateInput(EntityIdSchema, args.id);

  // Proceed with validated input
  return entityService.findById(entityId);
}
```

#### Custom Schemas

```typescript
import { z } from 'zod';

// Create custom schema
const UserInputSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: EmailSchema,
  age: z.number().int().min(18).max(120),
  roles: z.array(z.string()).min(1).max(10),
});

// Validate
const validated = validateInput(UserInputSchema, userInput);
```

#### GraphQL Resolver Wrapper

```typescript
import { withValidation } from '../validation';

const resolvers = {
  Mutation: {
    createEntity: withValidation(
      EntityInputSchema,
      async (parent, args, context) => {
        // args are already validated!
        return entityService.create(args);
      }
    ),
  },
};
```

---

## Sanitization

### Automatic Sanitization

All requests are automatically sanitized by the `sanitizeRequest` middleware:

```typescript
import sanitizeRequest from './middleware/sanitize';

app.use(sanitizeRequest);
```

### Manual Sanitization

```typescript
import { SanitizationUtils } from './validation';

// Sanitize HTML
const safe = SanitizationUtils.sanitizeHTML(userInput);

// Remove dangerous content
const cleaned = SanitizationUtils.removeDangerousContent(userInput);

// Sanitize entire object
const sanitized = SanitizationUtils.sanitizeUserInput(requestBody);
```

### What Gets Sanitized

- **HTML tags**: Converted to entities (`<` → `&lt;`)
- **JavaScript protocol**: Removed (`javascript:`)
- **Event handlers**: Removed (`onclick=`, `onerror=`)
- **Script tags**: Removed completely
- **Iframes**: Removed completely
- **Base64 data URIs**: Removed

---

## SQL/Cypher Injection Prevention

### Primary Defense: Parameterized Queries

**ALWAYS** use parameterized queries. Never interpolate user input into queries.

#### ✅ Correct (Parameterized)

```typescript
// Neo4j Cypher
const result = await session.run(
  'MATCH (n:Entity {id: $id, tenantId: $tenantId}) RETURN n',
  { id: entityId, tenantId }
);

// PostgreSQL
const result = await pool.query(
  'SELECT * FROM entities WHERE id = $1 AND tenant_id = $2',
  [entityId, tenantId]
);
```

#### ❌ Incorrect (Vulnerable to Injection)

```typescript
// NEVER DO THIS
const query = `MATCH (n:Entity {id: "${entityId}"}) RETURN n`;
const result = await session.run(query);

// NEVER DO THIS
const sql = `SELECT * FROM entities WHERE id = '${entityId}'`;
const result = await pool.query(sql);
```

### Secondary Defense: Query Validation

```typescript
import { QueryValidator } from './validation';

// Validate Cypher query
const validation = QueryValidator.validateCypherQuery(query, params);
if (!validation.valid) {
  throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
}

// Validate SQL query
const validation = QueryValidator.validateSQLQuery(query, params);
if (!validation.valid) {
  throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
}
```

### Dangerous Patterns Detected

- `DROP TABLE/DATABASE`
- `DELETE without WHERE`
- `UNION SELECT` (SQL injection)
- `CALL dbms.*` (Neo4j system calls)
- `;` multiple statements
- `xp_cmdshell` (SQL Server command execution)

---

## XSS Prevention

### Input Sanitization

All user input is sanitized before storage:

```typescript
import { SanitizationUtils } from './validation';

// Sanitize before saving
const safeDescription = SanitizationUtils.sanitizeHTML(userInput.description);

await entityService.create({
  ...userInput,
  description: safeDescription,
});
```

### Output Encoding

When rendering user content, use appropriate encoding:

```typescript
// In React (automatic escaping)
<div>{entity.description}</div>

// In templates (use encoding helpers)
<div>{{escapeHtml entity.description}}</div>
```

### Content Security Policy (CSP)

Helmet middleware sets CSP headers automatically:

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
```

---

## Rate Limiting

### Request Rate Limiting

```typescript
import { createRateLimitMiddleware } from './middleware/rateLimit';

// Global rate limit
app.use(
  createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  })
);

// Endpoint-specific rate limit
app.post(
  '/api/graphql',
  createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
  })
);
```

### Size-Based Rate Limiting

```typescript
import { createSizeBasedRateLimiter } from './middleware/request-validation';

// Limit bandwidth usage
app.use(
  createSizeBasedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxBytes: 100 * 1024 * 1024, // 100MB per minute
  })
);
```

### GraphQL Operation Rate Limiting

Handled automatically by the GraphQL validation plugin.

---

## Request Size Limits

### Body Size Limits

```typescript
import { createRequestValidationMiddleware } from './middleware/request-validation';

app.use(
  createRequestValidationMiddleware({
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxUrlLength: 2048,
    maxHeaderSize: 8192,
  })
);
```

### File Upload Limits

```typescript
import { createFileUploadValidator } from './middleware/request-validation';

app.post(
  '/upload',
  createFileUploadValidator({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  }),
  uploadHandler
);
```

### GraphQL Query Limits

```typescript
import { createGraphQLValidationPlugin } from './middleware/graphql-validation-plugin';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createGraphQLValidationPlugin({
      maxDepth: 15, // Max query depth
      maxComplexity: 1000, // Max query complexity
    }),
  ],
});
```

---

## GraphQL Security

### Query Complexity Limits

The GraphQL validation plugin automatically calculates and limits query complexity:

```typescript
// This query has high complexity due to nested lists
query {
  investigations {           // Complexity: 10 (list)
    entities {               // Complexity: 100 (nested list)
      relationships {        // Complexity: 1000 (doubly nested)
        target {
          name
        }
      }
    }
  }
}
// Total complexity: ~1100 (may exceed limit)
```

### Query Depth Limits

```typescript
// This query exceeds depth limit (15)
query {
  investigation {          // Depth: 1
    entities {             // Depth: 2
      relationships {      // Depth: 3
        target {           // Depth: 4
          relationships {  // Depth: 5
            // ... continues to depth 20
          }
        }
      }
    }
  }
}
```

### Introspection Control

Introspection is automatically disabled in production:

```typescript
// Blocked in production
query {
  __schema {
    types {
      name
    }
  }
}
```

### Persisted Queries

Use persisted queries to prevent arbitrary query execution:

```typescript
// Only allow pre-approved queries
const approvedQueries = {
  'getEntity': 'query GetEntity($id: ID!) { entity(id: $id) { id name } }',
};

// Validate operation name
if (!approvedQueries[operationName]) {
  throw new Error('Query not allowed');
}
```

---

## Best Practices

### 1. Validate All Inputs

```typescript
// ✅ Good
const validated = validateInput(EntityInputSchema, args);

// ❌ Bad
const entity = await createEntity(args); // Unvalidated
```

### 2. Use Parameterized Queries

```typescript
// ✅ Good
session.run('MATCH (n {id: $id}) RETURN n', { id });

// ❌ Bad
session.run(`MATCH (n {id: "${id}"}) RETURN n`);
```

### 3. Sanitize Before Storage

```typescript
// ✅ Good
const safe = SanitizationUtils.sanitizeHTML(input);
await save(safe);

// ❌ Bad
await save(input); // Unsanitized
```

### 4. Enforce Tenant Isolation

```typescript
// ✅ Good
const entity = await db.query(
  'SELECT * FROM entities WHERE id = $1 AND tenant_id = $2',
  [id, context.user.tenant]
);

// ❌ Bad
const entity = await db.query(
  'SELECT * FROM entities WHERE id = $1',
  [id]
);
```

### 5. Log Security Events

```typescript
// ✅ Good
if (!validation.valid) {
  logger.warn({
    event: 'validation_failed',
    errors: validation.errors,
    userId: context.user.id,
    input: sanitizeForLog(input),
  });
  throw new GraphQLError('Invalid input');
}
```

### 6. Fail Securely

```typescript
// ✅ Good
if (!hasPermission(user, 'entity:read')) {
  throw new GraphQLError('Access denied', {
    extensions: { code: 'FORBIDDEN' },
  });
}

// ❌ Bad
if (hasPermission(user, 'entity:read')) {
  return entity;
}
// Falls through without explicit denial
```

### 7. Rate Limit Expensive Operations

```typescript
// ✅ Good
app.post(
  '/api/ml/analyze',
  createRateLimitMiddleware({ windowMs: 60000, max: 5 }),
  mlHandler
);
```

### 8. Validate File Uploads

```typescript
// ✅ Good
const validation = FileUploadSchema.safeParse({
  filename: file.name,
  mimeType: file.type,
  size: file.size,
});

if (!validation.success) {
  throw new Error('Invalid file');
}
```

---

## Examples

### Complete Resolver Example

```typescript
import {
  EntityInputSchema,
  validateInput,
  SecurityValidator,
  BusinessRuleValidator,
} from '../validation';

const resolvers = {
  Mutation: {
    createEntity: async (parent, args, context) => {
      // 1. Validate authentication
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // 2. Validate input schema
      const validated = validateInput(EntityInputSchema, args);

      // 3. Security validation
      const securityCheck = SecurityValidator.validateInput(validated);
      if (!securityCheck.valid) {
        throw new GraphQLError(`Security validation failed: ${securityCheck.errors.join(', ')}`);
      }

      // 4. Permission check
      const permissionCheck = SecurityValidator.validatePermissions(
        context.user,
        'create',
        'entity'
      );
      if (!permissionCheck.valid) {
        throw new GraphQLError('Insufficient permissions');
      }

      // 5. Business rule validation
      const businessCheck = BusinessRuleValidator.validateEntityCreation(
        validated,
        {
          entityCount: await getEntityCount(context.user.tenant),
          user: context.user,
        }
      );
      if (!businessCheck.valid) {
        throw new GraphQLError(`Business rule violation: ${businessCheck.errors.join(', ')}`);
      }

      // 6. Sanitize inputs
      const safeEntity = {
        ...validated,
        name: SanitizationUtils.sanitizeHTML(validated.name),
        description: SanitizationUtils.sanitizeHTML(validated.description),
      };

      // 7. Create entity with parameterized query
      const result = await session.run(
        `CREATE (e:Entity {
          id: $id,
          tenantId: $tenantId,
          name: $name,
          description: $description,
          createdAt: datetime(),
          createdBy: $userId
        })
        RETURN e`,
        {
          id: uuidv4(),
          tenantId: context.user.tenant,
          name: safeEntity.name,
          description: safeEntity.description,
          userId: context.user.id,
        }
      );

      // 8. Audit log
      logger.info({
        event: 'entity_created',
        entityId: result.records[0].get('e').properties.id,
        userId: context.user.id,
        tenantId: context.user.tenant,
      });

      return result.records[0].get('e').properties;
    },
  },
};
```

### Complete API Endpoint Example

```typescript
import express from 'express';
import {
  createRequestValidationMiddleware,
  createRateLimitMiddleware,
  createFileUploadValidator,
} from './middleware';
import { validateInput, FileUploadSchema } from './validation';

const app = express();

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(createRequestValidationMiddleware());
app.use(sanitizeRequest);

// Rate-limited upload endpoint
app.post(
  '/api/upload',
  createRateLimitMiddleware({ windowMs: 60000, max: 10 }),
  createFileUploadValidator({
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
  }),
  async (req, res) => {
    try {
      // Validate file metadata
      const file = req.file;
      validateInput(FileUploadSchema, {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });

      // Process file (already validated)
      const result = await processUpload(file, req.user);

      res.json({ success: true, fileId: result.id });
    } catch (error) {
      logger.error({ error }, 'Upload failed');
      res.status(400).json({ error: error.message });
    }
  }
);
```

---

## Testing Security

### Validation Tests

```typescript
import { EntityIdSchema, validateInput } from '../validation';

describe('EntityIdSchema', () => {
  it('should accept valid UUID', () => {
    const valid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => validateInput(EntityIdSchema, valid)).not.toThrow();
  });

  it('should reject invalid UUID', () => {
    const invalid = 'not-a-uuid';
    expect(() => validateInput(EntityIdSchema, invalid)).toThrow();
  });

  it('should reject empty string', () => {
    expect(() => validateInput(EntityIdSchema, '')).toThrow();
  });
});
```

### Injection Tests

```typescript
import { QueryValidator } from '../validation';

describe('QueryValidator', () => {
  it('should detect SQL injection attempts', () => {
    const malicious = "'; DROP TABLE users; --";
    const result = QueryValidator.hasDangerousSQLPatterns(
      `SELECT * FROM users WHERE name = '${malicious}'`
    );
    expect(result).toBe(true);
  });

  it('should allow safe parameterized queries', () => {
    const safe = 'SELECT * FROM users WHERE id = $1';
    const result = QueryValidator.hasDangerousSQLPatterns(safe);
    expect(result).toBe(false);
  });
});
```

### XSS Tests

```typescript
import { SanitizationUtils } from '../validation';

describe('SanitizationUtils', () => {
  it('should sanitize XSS attempts', () => {
    const xss = '<script>alert("XSS")</script>';
    const safe = SanitizationUtils.removeDangerousContent(xss);
    expect(safe).not.toContain('<script>');
  });

  it('should escape HTML entities', () => {
    const html = '<div>Test</div>';
    const safe = SanitizationUtils.sanitizeHTML(html);
    expect(safe).toBe('&lt;div&gt;Test&lt;&#x2F;div&gt;');
  });
});
```

---

## Security Checklist

Before deploying to production, verify:

- [ ] All user inputs are validated with Zod schemas
- [ ] All database queries use parameterized inputs
- [ ] All user-generated content is sanitized before storage
- [ ] All user-generated content is escaped when rendered
- [ ] Rate limiting is enabled on all public endpoints
- [ ] Request size limits are configured appropriately
- [ ] GraphQL query complexity limits are enabled
- [ ] Helmet middleware is configured for security headers
- [ ] CORS is configured with appropriate origins
- [ ] Tenant isolation is enforced on all queries
- [ ] Authentication is required for sensitive operations
- [ ] Authorization checks are performed before data access
- [ ] Security events are logged and monitored
- [ ] Production secrets are not committed to version control
- [ ] Introspection is disabled in production
- [ ] File upload validation is in place

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Zod Documentation](https://zod.dev/)
- [GraphQL Security Best Practices](https://graphql.org/learn/best-practices/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Neo4j Security Guide](https://neo4j.com/docs/operations-manual/current/security/)

---

**Questions or Issues?**

Contact the security team or create an issue in the repository.
