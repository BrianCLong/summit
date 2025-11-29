# ADR-2025-002: TypeScript Strictness Migration Plan

**Status**: Proposed
**Date**: 2025-11-29
**Author**: Claude (AI Assistant)

## Context

The codebase currently uses relaxed TypeScript settings:

```json
// tsconfig.base.json
{
  "strict": false,
  "exactOptionalPropertyTypes": false,
  "noUncheckedIndexedAccess": false,
  "noImplicitOverride": false,
  "useUnknownInCatchVariables": false
}
```

Additionally, `server/tsconfig.json` has 60+ files in its exclude list, many of which have type errors.

## Current State Analysis

### Files with Type Issues (server/tsconfig.json excludes)

| Category | Count | Examples |
|----------|-------|----------|
| Database/Repos | 7 | `EntityRepo.ts`, `postgres.ts`, `timescale.ts` |
| Services | 15+ | `AuthService.ts`, `GraphRAGService.ts`, `DoclingService.ts` |
| Middleware | 8 | `opa.ts`, `opa-abac.ts`, `spiffe-auth.ts` |
| Routes | 7 | `nl2cypher.ts`, `compliance.ts`, `trust-center.ts` |
| Resolvers | 3 | `multimodalResolvers.ts`, `advancedML.ts` |
| Federal | 1 | `src/federal/**` (entire directory) |

### GraphQL Resolver Type Usage

Current pattern (widespread):
```typescript
async (_: any, { id }: { id: string }, context: any) => {
  // ...
}
```

Target pattern:
```typescript
async (_: unknown, args: EntityQueryArgs, context: ResolverContext) => {
  // ...
}
```

## Decision

Adopt an incremental strictness migration:

### Phase 1: Foundation (Immediate)
- [x] Create `types.ts` with core resolver types
- [x] Document type patterns in ADR
- [ ] Enable `noImplicitThis` (low impact)

### Phase 2: Critical Path (Q1 2026)
- [ ] Fix types in `EntityRepo.ts`, `RelationshipRepo.ts`, `InvestigationRepo.ts`
- [ ] Fix types in `postgres.ts`, `neo4j.ts`
- [ ] Remove these from tsconfig excludes

### Phase 3: Resolver Types (Q2 2026)
- [ ] Apply `ResolverContext` type to all resolver files
- [ ] Replace `any` with proper types in resolver arguments
- [ ] Enable `noImplicitAny` for `src/graphql/` directory

### Phase 4: Full Strictness (Q3 2026)
- [ ] Enable `strict: true` globally
- [ ] Address remaining excluded files
- [ ] Enable `exactOptionalPropertyTypes`

## Type Patterns to Adopt

### Resolver Context
```typescript
import type { ResolverContext } from './types.js';

const resolver = async (
  _parent: unknown,
  args: { id: string; tenantId?: string },
  context: ResolverContext
) => {
  const effectiveTenantId = args.tenantId ?? context.tenantId;
  // ...
};
```

### Tenant Extraction Helper
```typescript
function requireTenant(ctx: ResolverContext): string {
  const tenant = ctx.user?.tenant ?? ctx.tenantId;
  if (!tenant) {
    throw new GraphQLError('Tenant required', {
      extensions: { code: 'FORBIDDEN' }
    });
  }
  return tenant;
}
```

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ error: message }, 'Operation failed');
  throw error;
}
```

## Consequences

### Positive
- Catch bugs at compile time instead of runtime
- Better IDE autocompletion and documentation
- Safer refactoring

### Negative
- Initial investment to fix type errors
- May slow development temporarily during migration
- Some dynamic patterns may need refactoring

### Metrics to Track
- Number of excluded files in tsconfig (target: 0)
- `any` usage count (measure with `grep -r ": any" | wc -l`)
- Type coverage percentage

## UI Component Naming Convention

The project uses two patterns for UI components:

| Pattern | Usage | Examples |
|---------|-------|----------|
| PascalCase | Custom components | `SearchBar.tsx`, `EmptyState.tsx` |
| kebab-case | shadcn/ui components | `input.tsx`, `slider.tsx`, `alert.tsx` |

This dual pattern is intentional and follows shadcn/ui conventions. Do not normalize.
