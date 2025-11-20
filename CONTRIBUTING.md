# Contributing to IntelGraph

## Prereqs

- Node 20 LTS, pnpm 9 (corepack)
- Docker (Compose) for local services

## Setup

- corepack enable && corepack prepare pnpm@9.12.3 --activate
- make bootstrap

## Common Tasks

- Typecheck: `make typecheck`
- Lint: `make lint`
- Test: `make test`
- E2E (smoke): `make e2e`
- Build all: `make build`
- Codegen (GraphQL): `make codegen`
- Bring up services: `make up` / `make down`

## Branch & PR

- Keep changes scoped; run `scripts/pr_guard.sh` before PR
- CI must be green; merge queue enforces required checks

## Logging Best Practices

### Use Structured Logging

Always use the `@intelgraph/logger` package for consistent structured logging:

```typescript
import { logger } from '@intelgraph/logger';

// ✅ Good - Structured with metadata
logger.info('User profile updated', { userId, action: 'update-profile' });

// ❌ Bad - String concatenation
logger.info(`User ${userId} updated profile`);

// ❌ Bad - console.log
console.log('User profile updated');
```

### Log Levels

Choose appropriate log levels:

- **ERROR**: Operation failed, needs attention
- **WARN**: Unexpected condition, but handled
- **INFO**: Normal operations, state changes
- **DEBUG**: Detailed debugging information
- **TRACE**: Very detailed tracing (usually disabled)

### Include Context

Always include relevant context in logs:

```typescript
logger.error('Database query failed', {
  query,
  error: err.message,
  userId,
  tenantId,
  duration,
});
```

### Never Log Sensitive Data

Do not log:
- Passwords, tokens, API keys
- Credit card numbers, SSNs
- Personal identification information
- Authorization headers

The system auto-redacts common sensitive fields, but always be careful!

### Use Child Loggers

Create child loggers for specific contexts:

```typescript
class UserService {
  private logger = logger.child({ service: 'UserService' });

  async updateUser(userId: string) {
    this.logger.info('Updating user', { userId });
  }
}
```

### Audit Security Events

Always audit security-critical events:

```typescript
import { logAuthSuccess, logDataAccess } from '@intelgraph/logger';

logAuthSuccess(userId, { ip: req.ip });
logDataAccess('update', 'user', userId);
```

See [docs/logging/STRUCTURED_LOGGING.md](docs/logging/STRUCTURED_LOGGING.md) for complete documentation.

## Troubleshooting

- Run `scripts/green_build.sh` to self-heal and build
- Run `node scripts/audit_workspaces.mjs --strict` for hard audit
