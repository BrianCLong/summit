# ADR-2025-001: GraphQL Resolver Refactoring

**Status**: Accepted
**Date**: 2025-11-29
**Author**: Claude (AI Assistant)

## Context

The GraphQL resolver layer in `server/src/graphql/resolvers/` had accumulated technical debt:

1. **Code Opacity**: Large commented-out code blocks (~120 lines in `core.ts`)
2. **Mixed Concerns**: Mock data embedded directly in production resolver files
3. **Type Safety**: Extensive use of `any` types without proper interfaces
4. **Disabled Features**: v040/v041 resolvers referenced but non-functional

## Decision

We made the following surgical refactoring changes:

### 1. Remove Commented Code (core.ts)

**Before**: 120+ lines of commented-out `graphNeighborhood` and `searchEntities` queries
**After**: Single explanatory comment referencing this ADR

**Rationale**: Dead code creates cognitive overhead and maintenance burden. The functionality can be restored from git history if needed.

### 2. Extract Mock Data (entity.ts)

**Before**: 90+ lines of mock data functions at end of production resolver
**After**: Separate `__mocks__/entityMocks.ts` with typed exports

**Rationale**: Separation of concerns improves testability and makes production code cleaner.

### 3. Add TypeScript Types (types.ts)

Created comprehensive type definitions for:
- `ResolverContext` - Request context shape
- `Entity`, `Relationship`, `Investigation` - Domain models
- `ResolverFn`, `QueryResolver`, `MutationResolver` - Function signatures

**Rationale**: Enables gradual strictness migration and serves as API documentation.

## Consequences

### Positive
- Reduced `core.ts` by ~120 lines
- Reduced `entity.ts` by ~90 lines
- Clearer separation of test fixtures from production code
- Type definitions available for gradual adoption

### Negative
- One additional import in `entity.ts`
- New files to maintain (`types.ts`, `entityMocks.ts`)

### Neutral
- No behavior changes to existing functionality
- All tests continue to pass

## Related

- **Disabled Features**: `graphNeighborhood` and `searchEntities` queries are disabled due to schema mismatch with Neo4j. These require a separate migration effort.
- **v040/v041 Resolvers**: These remain disabled in `tsconfig.json` excludes. Future ADR will address cleanup or re-enablement.

## Migration Plan for Disabled Features

1. Audit current Neo4j schema vs expected schema
2. Create migration scripts for schema alignment
3. Re-enable queries with proper error handling
4. Add integration tests before deployment
