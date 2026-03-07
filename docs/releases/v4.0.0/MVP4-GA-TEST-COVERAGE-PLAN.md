# MVP-4-GA Test Coverage Improvement Plan

**Version**: 4.0.0 | **Code Name**: Ironclad Standard
**Current Coverage**: ~22% | **Target Coverage**: 70%
**Last Updated**: 2025-12-29

---

## Executive Summary

This plan provides a prioritized, actionable roadmap to increase test coverage from the current ~22% to the MVP-4-GA target of 70%. The plan is organized by risk level and estimated effort, enabling parallel execution across workstreams.

### Current State

| Component    | Source Files | Test Files | Coverage | Gap       |
| ------------ | ------------ | ---------- | -------- | --------- |
| **Server**   | 2,961        | 777        | 26.2%    | 43.8%     |
| **Client**   | 448          | 64         | 14.3%    | 55.7%     |
| **Apps/Web** | 386          | 44         | 11.4%    | 58.6%     |
| **Total**    | 3,795        | 885        | 23.3%    | **46.7%** |

---

## Phase 1: Critical Path (Week 1-2) - P0 Blockers

### 1.1 Authentication & Authorization (MUST HAVE)

| File                       | Location                  | Lines | Effort | Priority |
| -------------------------- | ------------------------- | ----- | ------ | -------- |
| `opa-abac.ts`              | `/server/src/middleware/` | 600+  | 8h     | **P0**   |
| `AuthContext.tsx`          | `/client/src/contexts/`   | 120   | 4h     | **P0**   |
| `UserRepository.ts`        | `/server/src/data/`       | 300+  | 6h     | **P0**   |
| `RoleManagementService.ts` | `/server/src/services/`   | 800+  | 12h    | **P0**   |

**Test Categories Required:**

- [ ] Positive: Valid JWT token processing
- [ ] Negative: Expired/malformed tokens rejected
- [ ] RBAC: Role-based access enforced
- [ ] Edge: Concurrent session handling

### 1.2 Data Validation & Security (MUST HAVE)

| File                 | Location                  | Lines | Effort | Priority |
| -------------------- | ------------------------- | ----- | ------ | -------- |
| `ingestValidator.ts` | `/server/src/middleware/` | 850   | 10h    | **P0**   |
| `graphAbuseGuard.ts` | `/server/src/middleware/` | 700+  | 8h     | **P0**   |
| `siemMiddleware.ts`  | `/server/src/middleware/` | 500+  | 6h     | **P0**   |

**Test Categories Required:**

- [ ] Input sanitization (XSS, injection)
- [ ] Rate limiting enforcement
- [ ] Malformed payload rejection
- [ ] Abuse pattern detection

### 1.3 Core CRUD Operations (MUST HAVE)

| File                       | Location                         | Lines | Effort | Priority |
| -------------------------- | -------------------------------- | ----- | ------ | -------- |
| `crudResolvers.ts`         | `/server/src/graphql/resolvers/` | 1,832 | 16h    | **P0**   |
| `entity.ts`                | `/server/src/graphql/resolvers/` | 800+  | 10h    | **P0**   |
| `governedInvestigation.ts` | `/server/src/graphql/resolvers/` | 600+  | 8h     | **P0**   |

**Test Categories Required:**

- [ ] Create/Read/Update/Delete operations
- [ ] Authorization checks per operation
- [ ] Input validation
- [ ] Error handling (not found, conflict, etc.)

---

## Phase 2: Business Logic (Week 3-4) - P1 Required

### 2.1 Compliance & Audit (ENTERPRISE CRITICAL)

| File                   | Location                | Lines  | Effort | Priority |
| ---------------------- | ----------------------- | ------ | ------ | -------- |
| `ComplianceService.ts` | `/server/src/services/` | 1,500+ | 16h    | **P1**   |
| `RTBFAuditService.ts`  | `/server/src/services/` | 1,200+ | 12h    | **P1**   |
| `TenantSLOService.ts`  | `/server/src/services/` | 1,000+ | 10h    | **P1**   |

**Test Categories Required:**

- [ ] Audit trail generation
- [ ] Retention policy enforcement
- [ ] SLO calculation accuracy
- [ ] RTBF (Right to Be Forgotten) processing

### 2.2 Financial Services (COMPLIANCE CRITICAL)

| File                          | Location                              | Lines | Effort | Priority |
| ----------------------------- | ------------------------------------- | ----- | ------ | -------- |
| `FraudDetectionService.ts`    | `/server/src/financial/fraud/`        | 800+  | 12h    | **P1**   |
| `RiskAnalyticsService.ts`     | `/server/src/financial/risk/`         | 600+  | 10h    | **P1**   |
| `TradeSurveillanceService.ts` | `/server/src/financial/surveillance/` | 500+  | 8h     | **P1**   |
| `RiskRepository.ts`           | `/server/src/db/repositories/`        | 400+  | 6h     | **P1**   |

**Test Categories Required:**

- [ ] Risk score calculation accuracy
- [ ] Alert generation thresholds
- [ ] Historical data aggregation
- [ ] Edge case handling (missing data)

### 2.3 AI Governance (TRUST CRITICAL)

| File                          | Location                     | Lines  | Effort | Priority |
| ----------------------------- | ---------------------------- | ------ | ------ | -------- |
| `BehavioralAnomalyService.ts` | `/server/src/ai/governance/` | 1,000+ | 14h    | **P1**   |
| `PolicySuggestionService.ts`  | `/server/src/ai/governance/` | 900+   | 12h    | **P1**   |
| `VerdictExplainerService.ts`  | `/server/src/ai/governance/` | 800+   | 10h    | **P1**   |

**Test Categories Required:**

- [ ] Anomaly detection accuracy
- [ ] Policy suggestion relevance
- [ ] Explanation generation quality
- [ ] Confidence scoring

---

## Phase 3: Graph & Visualization (Week 5-6) - P1 Required

### 3.1 Graph Visualization (USER EXPERIENCE)

| File                          | Location                                | Lines | Effort | Priority |
| ----------------------------- | --------------------------------------- | ----- | ------ | -------- |
| `DataVisualizationStudio.tsx` | `/client/src/components/`               | 912   | 16h    | **P1**   |
| `KGExplorer.tsx`              | `/client/src/components/explorer/`      | 800+  | 14h    | **P1**   |
| `InteractiveGraphCanvas.tsx`  | `/client/src/components/visualization/` | 600+  | 10h    | **P1**   |
| `ProgressiveGraph.tsx`        | `/ga-graphai/packages/web/src/`         | 500+  | 8h     | **P1**   |

**Test Categories Required:**

- [ ] Node/edge rendering correctness
- [ ] Layout algorithm output
- [ ] User interaction handling
- [ ] Performance benchmarks (FPS targets)

### 3.2 State Management (DATA INTEGRITY)

| File                  | Location                  | Lines | Effort | Priority |
| --------------------- | ------------------------- | ----- | ------ | -------- |
| `graphSlice.ts`       | `/client/src/store/`      | 200+  | 4h     | **P1**   |
| `annotationsSlice.ts` | `/apps/web/src/features/` | 300+  | 6h     | **P1**   |
| `exportJobsStore.ts`  | `/apps/web/src/store/`    | 200+  | 4h     | **P1**   |

**Test Categories Required:**

- [ ] Reducer state transitions
- [ ] Action creator correctness
- [ ] Selector memoization
- [ ] Async thunk handling

---

## Phase 4: GraphRAG & AI (Week 7-8) - P0/P1

### 4.1 GraphRAG Core (DIFFERENTIATOR)

| File                                | Location                         | Lines  | Effort | Priority |
| ----------------------------------- | -------------------------------- | ------ | ------ | -------- |
| `GraphRAGService.ts`                | `/server/src/services/`          | 1,000+ | 16h    | **P0**   |
| `HallucinationMitigationService.ts` | `/server/src/services/`          | 800+   | 14h    | **P0**   |
| `citation-gate.ts`                  | `/server/src/services/graphrag/` | 400+   | 8h     | **P0**   |
| `graphrag-provenance.service.ts`    | `/server/src/ai/copilot/`        | 500+   | 10h    | **P1**   |

**Test Categories Required:**

- [ ] Context retrieval accuracy
- [ ] Citation validation
- [ ] Hallucination detection
- [ ] Provenance chain integrity

### 4.2 LLM Integration (RELIABILITY)

| File                    | Location                         | Lines | Effort | Priority |
| ----------------------- | -------------------------------- | ----- | ------ | -------- |
| `openai-provider.ts`    | `/server/src/llm/providers/`     | 300+  | 6h     | **P1**   |
| `anthropic-provider.ts` | `/server/src/llm/providers/`     | 300+  | 6h     | **P1**   |
| `llm-adapter.ts`        | `/server/src/services/graphrag/` | 400+  | 8h     | **P1**   |

**Test Categories Required:**

- [ ] API response parsing
- [ ] Error handling (rate limits, timeouts)
- [ ] Token counting accuracy
- [ ] Cost tracking

---

## Test Stub Generation Priority

### Immediate (This Sprint)

```
server/src/middleware/__tests__/
├── opa-abac.test.ts            # P0 - ABAC enforcement
├── ingestValidator.test.ts     # P0 - Input validation
├── graphAbuseGuard.test.ts     # P0 - Abuse prevention

server/src/graphql/resolvers/__tests__/
├── crudResolvers.test.ts       # P0 - Core CRUD
├── entity.test.ts              # P0 - Entity operations

server/src/services/__tests__/
├── GraphRAGService.test.ts     # P0 - RAG queries
├── HallucinationMitigationService.test.ts  # P0 - Hallucination

client/src/contexts/__tests__/
├── AuthContext.test.tsx        # P0 - Auth state
```

---

## Coverage Metrics & Gates

### CI Gate Configuration

```yaml
# jest.config.js coverage thresholds
coverageThreshold:
  global:
    branches: 60
    functions: 65
    lines: 70
    statements: 70

  # Critical path modules - higher thresholds
  "./server/src/middleware/":
    branches: 80
    functions: 85
    lines: 85

  "./server/src/services/GraphRAGService.ts":
    branches: 75
    functions: 80
    lines: 80
```

### Weekly Coverage Targets

| Week | Target | Focus Area              |
| ---- | ------ | ----------------------- |
| 1    | 30%    | Auth, Middleware, CRUD  |
| 2    | 40%    | Compliance, Financial   |
| 3    | 50%    | AI Governance, GraphRAG |
| 4    | 60%    | Graph Visualization     |
| 5    | 65%    | State Management, APIs  |
| 6    | 70%    | Edge Cases, Integration |

---

## Test Patterns & Standards

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ServiceUnderTest } from "../ServiceUnderTest";

describe("ServiceUnderTest", () => {
  let service: ServiceUnderTest;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDependency = {
      method: vi.fn(),
    };
    service = new ServiceUnderTest(mockDependency);
  });

  describe("methodName", () => {
    it("should handle valid input correctly", async () => {
      // Arrange
      const input = {
        /* valid data */
      };
      mockDependency.method.mockResolvedValue(/* expected */);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(/* expected output */);
      expect(mockDependency.method).toHaveBeenCalledWith(/* expected args */);
    });

    it("should reject invalid input with appropriate error", async () => {
      // Arrange
      const invalidInput = {
        /* invalid data */
      };

      // Act & Assert
      await expect(service.methodName(invalidInput)).rejects.toThrow("Expected error message");
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, teardownTestDatabase } from "../test-utils";

describe("Integration: Feature Name", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("should complete end-to-end workflow", async () => {
    // Step 1: Create entity
    // Step 2: Perform operation
    // Step 3: Verify state
  });
});
```

---

## Effort Summary

| Phase           | Modules | Estimated Hours | FTEs (40h/wk) |
| --------------- | ------- | --------------- | ------------- |
| Phase 1 (P0)    | 10      | 88h             | 2.2 weeks     |
| Phase 2 (P1)    | 10      | 110h            | 2.75 weeks    |
| Phase 3 (P1)    | 7       | 62h             | 1.55 weeks    |
| Phase 4 (P0/P1) | 7       | 68h             | 1.7 weeks     |
| **Total**       | **34**  | **328h**        | **8.2 weeks** |

With 2 developers: **~4 weeks** to reach 70% coverage target.

---

## Success Criteria

- [ ] 70% line coverage on `main` branch
- [ ] 80% coverage on P0 modules (middleware, auth, GraphRAG)
- [ ] Zero flaky tests (quarantine mechanism active)
- [ ] All tests pass in <5 minutes
- [ ] Coverage gates block PRs that reduce coverage
