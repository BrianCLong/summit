# IntelGraph Merge Orchestrator - Batch 2025-08-17

## Merge Plan Note

**Batch ID**: 2025-08-17-11PM  
**Status**: Resolving divergent branches  
**Risk Level**: HIGH (core schema and resolver conflicts)

### Current State
- Local main diverged from origin/main (8 local vs 27 remote commits)
- Major conflicts in:
  - `server/src/graphql/resolvers/crudResolvers.ts` (subscription resolvers, entity updates)
  - `server/src/graphql/schema/crudSchema.ts` (TTP correlation vs canonicalId)
  - `client/src/components/graph/EnhancedGraphExplorer.jsx` (sentiment display vs standard styling)
  - `client/src/generated/graphql.json` (query signatures)
  - Multiple other files

### Conflict Resolution Policy Applied
1. **Schema Integration**: Merge both TTP correlation AND canonicalId features
2. **GraphQL Resolvers**: Preserve subscription resolve functions, combine field updates
3. **UI Components**: Keep sentiment features behind feature flag
4. **API Consistency**: Maintain backward compatibility with existing queries

### Affected Areas
- GraphQL schema and resolvers (HIGH RISK)
- Frontend graph visualization (MEDIUM RISK) 
- API endpoints and subscriptions (HIGH RISK)
- Database integration (HIGH RISK)

## PRs Included in Queue (30 remaining)
- PR 456: Custom metadata schema support (UNKNOWN mergeable)
- PR 455: Real-time graph merge conflict detection (UNKNOWN mergeable)  
- PR 450: Entity image upload (CONFLICTING)
- [Additional 27 PRs listed in priority order]

## Test Transcript Summary
- [ ] Lint/typecheck
- [ ] Unit/Integration tests
- [ ] E2E tests
- [ ] Performance smoke tests
- [ ] Build validation

## Next Steps
1. Resolve current merge conflicts systematically
2. Run full test suite
3. Commit resolved merge
4. Begin PR batch merging with gating