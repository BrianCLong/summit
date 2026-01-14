# Runtime Governance Developer Guide

This guide describes the "Golden Path" for implementing safe, governed features in the Summit monorepo. By following these patterns, you ensure your code handles multi-tenancy correctly, respects kill switches, and produces required audit evidence.

## 1. Creating a Governed Route

All new API routes must use the `createGovernedHandler` wrapper (or equivalent middleware chain) to ensure consistent policy enforcement.

### The Pattern

```typescript
import { createGovernedHandler } from '../utils/governedHandler';
import { z } from 'zod';

// 1. Define input schema
const CreateResourceSchema = z.object({
  name: z.string().min(1),
  sensitive: z.boolean().default(false),
});

export const createResource = createGovernedHandler({
  // 2. Define operation metadata
  operationId: 'create_resource',
  action: 'resource:create',
  resourceType: 'resource',

  // 3. Declare schema for validation
  schema: {
    body: CreateResourceSchema
  },

  // 4. Implement the handler
  handler: async (ctx) => {
    // Context (ctx) provides safe, tenant-scoped accessors
    const { tenantId, logger, db } = ctx;

    // Perform logic
    const result = await db.resources.create({
      data: {
        ...ctx.body,
        tenantId, // Always use tenantId from context
      }
    });

    // 5. Return result with verdict
    return {
      status: 201,
      body: result,
      // Verdict is automatically appended by the wrapper based on policy checks
    };
  }
});
```

## 2. Tenant Context & Propagation

Never manually parse `req.headers['x-tenant-id']`. Always use the provided context.

- **In Handlers:** Use `ctx.tenantId`.
- **In Services:** Pass `TenantContext` as the first argument.
- **In Background Jobs:** Explicitly resolve tenant context before starting work.

### Service Layer Pattern

```typescript
// Good
class ResourceService {
  async create(ctx: TenantContext, data: CreateDTO) {
    // Assert tenant scope for data access
    return this.repo.create({
      ...data,
      tenantId: ctx.tenantId
    });
  }
}

// Bad
class ResourceService {
  async create(tenantId: string, data: CreateDTO) {
    // Risk: tenantId might be mixed up or forgotten
  }
}
```

## 3. Returning GovernanceVerdict

The `GovernanceVerdict` communicates *why* an action was allowed or denied. It is critical for audit trails.

The `createGovernedHandler` wrapper automatically constructs a verdict for successful operations. If you need to deny an action based on custom logic, throw a `GovernanceError`:

```typescript
import { GovernanceError } from '../governance/errors';

if (resource.isLocked) {
  throw new GovernanceError({
    code: 'RESOURCE_LOCKED',
    message: 'Resource is locked by another policy',
    policyId: 'pol_123',
    action: 'DENY'
  });
}
```

## 4. Write Paths & Read-Only Mode

All write operations must check for "Safety Mode" or "Kill Switch" activation.

- **Implicit:** `createGovernedHandler` checks `isMutatingRequest` and blocks writes if the kill switch is active for the tenant.
- **Explicit:** Use `killSwitchGuard` for granular control.

```typescript
// In a custom flow
const guard = await killSwitchGuard(ctx, { action: 'resource:delete' });
if (guard.verdict === 'DENY') {
  throw new GovernanceError({ ...guard.reason });
}
```

## 5. Break-Glass (Emergency Bypass)

**Never make break-glass the default.** It requires explicit capability and logging.

If you must bypass governance (e.g., for emergency data repair), use the `SystemContext` with a reason.

```typescript
// Requires 'internal/admin' scope
const sudoCtx = await createSystemContext({
  reason: 'INCIDENT-123: Repair corrupted index',
  bypassPolicies: ['pol_read_only']
});

await service.repair(sudoCtx, id);
```

## 6. Testing

Tests must verify both the success path and the governance failure path.

```typescript
import { createMockContext } from '../test/helpers';

test('createResource respects tenant isolation', async () => {
  const ctx1 = createMockContext({ tenantId: 't1' });
  const ctx2 = createMockContext({ tenantId: 't2' });

  await handler(ctx1);

  // Verify data is not visible to t2
  const result = await db.resources.findFirst({ where: { tenantId: 't2' } });
  assert.equal(result, null);
});

test('createResource is blocked by kill switch', async () => {
  const ctx = createMockContext({ tenantId: 't1' });
  mockKillSwitch.enable('t1');

  await assert.rejects(handler(ctx), /kill switch active/);
});
```
