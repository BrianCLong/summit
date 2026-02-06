# Express 5 Migration Plan

**Source:** Closed PR #1261 (express5/eslint9 upgrade)
**Status:** DEFERRED - Post-GA
**Salvage Ledger Reference:** [SALVAGE_FROM_CLOSED_PRS.md](./SALVAGE_FROM_CLOSED_PRS.md)
**Created:** 2026-01-26

---

## Executive Summary

Express 5 migration was partially completed in closed PR #1261:
- **ESLint 9:** DONE - Currently at v9.39.1 with flat config
- **Express 5:** NOT DONE - Currently at Express 4.21.2

This document outlines a phased approach for completing the Express 5 migration post-GA.

---

## Current State Assessment

### Express Version
```
express: ^4.21.2
```

### Async Handler Analysis
- **Total async route handlers:** 788+
- **Using asyncHandler wrapper:** 8 (1%)
- **Try-catch wrapped handlers:** 170 files with patterns needing review

### Error Handling Infrastructure
- `asyncHandler` utility exists at `server/src/utils/asyncHandler.ts`
- Error middleware present but needs Express 5 compatibility updates
- Centralized error handler exists but not consistently applied

---

## Migration Phases

### Phase 1: asyncHandler Standardization (Pre-Express 5)
**Complexity:** Medium | **Risk:** Low | **Duration:** 2-3 sprints

1. Audit all async route handlers
2. Apply `asyncHandler` wrapper to all async routes
3. Remove explicit try-catch blocks where asyncHandler handles errors
4. Add tests for error propagation

**Success Criteria:**
- All async handlers wrapped with asyncHandler
- Error handling tests pass
- No regression in error responses

### Phase 2: Error Handler Consolidation
**Complexity:** Low | **Risk:** Low | **Duration:** 1 sprint

1. Consolidate error handling to single global middleware
2. Remove router-level error handlers (Express 5 deprecates)
3. Standardize error response format
4. Update error logging

**Success Criteria:**
- Single error handler at app level
- Consistent error response shape
- Error telemetry working

### Phase 3: Express 5 Upgrade
**Complexity:** Medium | **Risk:** Medium | **Duration:** 2 sprints

1. Update `express` dependency to v5.x
2. Address breaking changes:
   - Path route matching changes
   - `req.query` is now a getter
   - `res.status()` returns the response object
   - Async error handling (automatic with asyncHandler prep)
3. Update middleware compatibility
4. Run full E2E test suite

**Success Criteria:**
- Express 5 installed and running
- All routes working correctly
- E2E tests pass
- No performance regression

### Phase 4: Cleanup and Documentation
**Complexity:** Low | **Risk:** Low | **Duration:** 1 sprint

1. Remove Express 4 compatibility shims
2. Update documentation
3. Add Express 5 best practices to CONTRIBUTING.md
4. Close related technical debt issues

---

## Risk Mitigation

### Breaking Changes in Express 5
| Change | Impact | Mitigation |
|--------|--------|------------|
| Path matching strictness | Route parameters may behave differently | Audit routes with regex/wildcards |
| `req.query` getter | Accessing query params changes slightly | Minimal - mostly compatible |
| Removed deprecated features | `app.del()`, `res.send(status)` | Audit and replace before upgrade |
| Promise rejection handling | Unhandled rejections crash app | asyncHandler prep handles this |

### Rollback Plan
1. Keep Express 4 as separate branch
2. Feature flag for critical routes
3. Blue-green deployment strategy
4. Database schema compatibility maintained

---

## Files Requiring Changes

### High-Impact Files (Review First)
```
server/src/app.ts                    # Main app setup
server/src/middleware/error.ts       # Error handler
server/src/routes/index.ts           # Route registration
server/src/utils/asyncHandler.ts     # Async wrapper
```

### Route Files (788+ handlers across these)
```
server/src/routes/**/*.ts
server/src/api/**/*.ts
```

---

## Testing Strategy

### Unit Tests
- Error propagation through asyncHandler
- Error response format consistency
- Route parameter parsing

### Integration Tests
- Full API contract tests
- Error scenario coverage
- Auth flow validation

### E2E Tests
- Playwright suite (existing)
- Load testing for performance regression
- Error boundary testing

---

## Dependencies

### Blocking
- asyncHandler standardization must complete before Express 5 upgrade

### Related
- OpenTelemetry instrumentation updates (may need version bump)
- Rate limiting middleware compatibility
- Session/auth middleware compatibility

---

## Success Metrics

1. **Zero regressions:** All existing tests pass
2. **Error handling improvement:** Consistent error responses across all routes
3. **Performance maintained:** p95 latency within 5% of current
4. **Developer experience:** Simpler async route patterns

---

## References

- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html)
- [Closed PR #1261](https://github.com/BrianCLong/summit/pull/1261)
- [SALVAGE_FROM_CLOSED_PRS.md](./SALVAGE_FROM_CLOSED_PRS.md)
