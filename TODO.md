# TECHNICAL TODO ITEMS

## Completed Items

- ✅ 55. Performance: Add performance optimizations to findDuplicateCandidates method in SimilarityService.js
  - Implemented caching, early exits, and blocking for large datasets
  - Expected performance improvement: 40-60% reduction in comparison time for datasets >100 entities

## Future Feature Work

### Authentication Enhancements
**54. WebAuthn: Implement WebAuthn step-up authentication**
- **Priority**: P2 (Nice-to-have)
- **Effort**: Large (2-3 weeks)
- **Dependencies**: Requires WebAuthn library integration, backend storage for credentials, UI flows
- **Notes**: Consider integration with existing JWT/API key auth in `apps/api/src/middleware/security.ts`

### UX Improvements for Deduplication Workflow
**56-59. Deduplication Inspector Enhancements**
- **Priority**: P2 (Nice-to-have)
- **Effort**: Medium (1-2 weeks total)
- **Component**: `intelgraph/client/src/components/DeduplicationInspector.jsx`
- **Planned improvements**:
  - 56. Add toast notifications when merge fails (use React Toast library)
  - 57. Add loading spinner/skeleton during merge operations
  - 58. Add expandable detail panels for entity comparison
  - 59. Add slider/input control for adjustable similarity threshold
- **Notes**: These are UX polish items that should be prioritized based on user feedback

---

_Last updated: 2026-01-01_
_For tracking of these items in project management, see: PROJECT_MANAGEMENT_SATURATION.md_
