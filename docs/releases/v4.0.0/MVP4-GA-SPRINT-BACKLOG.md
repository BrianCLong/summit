# MVP-4-GA Sprint Backlog

**Version**: 4.0.0 | **Code Name**: Ironclad Standard
**Sprint Duration**: 60 days (4 two-week sprints)
**Story Point Scale**: Fibonacci (1, 2, 3, 5, 8, 13, 21)
**Velocity Assumption**: 40 SP/sprint (2 developers)

---

## Sprint 1: Stop the Bleeding (Days 1-14)

**Sprint Goal**: Fix critical performance and safety blockers

### Epic 1.1: Graph Performance (21 SP)

| ID        | Story                                                                      | SP  | Priority | Assignee |
| --------- | -------------------------------------------------------------------------- | --- | -------- | -------- |
| GRAPH-001 | As a user, I can view graphs with 10K+ nodes without browser freezing      | 8   | P0       | -        |
| GRAPH-002 | As a user, I see progressive loading with visual feedback for large graphs | 5   | P0       | -        |
| GRAPH-003 | As a system, supernodes (>1000 connections) don't block query execution    | 5   | P0       | -        |
| GRAPH-004 | As a user, I can use LOD controls to adjust rendering detail               | 3   | P1       | -        |

**GRAPH-001: 10K+ Node Graph Rendering**

```
Acceptance Criteria:
- [ ] Graph with 50K nodes renders in <1 second
- [ ] Browser maintains 30+ FPS during pan/zoom
- [ ] Memory usage stays under 2GB for 50K nodes
- [ ] WebGL renderer activates for graphs >5K nodes
- [ ] Viewport culling hides off-screen elements

Technical Tasks:
1. Integrate Sigma.js as WebGL alternative to Cytoscape
2. Implement viewport-aware rendering
3. Add node clustering for dense regions
4. Create performance benchmark suite
```

**GRAPH-002: Progressive Loading**

```
Acceptance Criteria:
- [ ] Loading spinner shows during initial render
- [ ] Nodes appear in batches of 100 with smooth animation
- [ ] Progress indicator shows % complete
- [ ] User can interact before full load (partial rendering)
- [ ] Cancel button stops loading if needed

Technical Tasks:
1. Extend ProgressiveGraph component with cancellation
2. Add progress event emissions
3. Implement interruptible batch processing
4. Create loading UI overlay component
```

**GRAPH-003: Supernode Query Optimization**

```
Acceptance Criteria:
- [ ] Queries involving entities with >1000 connections complete in <2s
- [ ] Automatic pagination kicks in for supernode traversals
- [ ] Query planner detects supernodes before execution
- [ ] Pre-computed aggregations for top 100 supernodes
- [ ] Clear warning shown to user for heavy queries

Technical Tasks:
1. Add connection_count index to Neo4j Entity nodes
2. Implement supernode detection in query planner
3. Create pagination wrapper for large result sets
4. Build background job for supernode pre-computation
```

### Epic 1.2: GraphRAG Safety (13 SP)

| ID      | Story                                                                | SP  | Priority | Assignee |
| ------- | -------------------------------------------------------------------- | --- | -------- | -------- |
| RAG-001 | As a user, every AI answer includes citations to source entities     | 5   | P0       | -        |
| RAG-002 | As a user, I see confidence scores for AI assertions                 | 3   | P0       | -        |
| RAG-003 | As a user, I'm warned when AI may be hallucinating                   | 3   | P0       | -        |
| RAG-004 | As an admin, I can require citations before AI answers are published | 2   | P1       | -        |

**RAG-001: Mandatory Citation Enforcement**

```
Acceptance Criteria:
- [ ] Every factual claim has [entity:ID] or [evidence:ID] citation
- [ ] Uncited claims are flagged with warning icon
- [ ] Citation density metric shown (claims/citations ratio)
- [ ] Links to source entities are clickable
- [ ] Export includes citation references

Technical Tasks:
1. Enhance citation-gate.ts validation rules
2. Add citation extraction to LLM response parser
3. Create CitationDisplay React component
4. Implement citation density scoring
```

**RAG-002: Confidence Scoring**

```
Acceptance Criteria:
- [ ] Each answer shows confidence score (0-100%)
- [ ] Color coding: green (>80%), yellow (50-80%), red (<50%)
- [ ] Tooltip explains confidence calculation
- [ ] Low confidence triggers additional verification
- [ ] Historical confidence tracking per query type

Technical Tasks:
1. Extend GraphRAGResponse schema with confidence field
2. Implement multi-factor confidence calculation
3. Add confidence badge component
4. Create confidence trend analytics
```

### Epic 1.3: Critical Bug Fixes (8 SP)

| ID      | Story                                             | SP  | Priority | Assignee |
| ------- | ------------------------------------------------- | --- | -------- | -------- |
| BUG-001 | Fix: API returns 500 on malformed GraphQL queries | 3   | P0       | -        |
| BUG-002 | Fix: WebSocket disconnects under load             | 3   | P0       | -        |
| BUG-003 | Fix: Memory leak in long-running sessions         | 2   | P0       | -        |

---

## Sprint 2: Core Quality (Days 15-28)

**Sprint Goal**: Achieve 50% test coverage and implement audit logging

### Epic 2.1: Test Coverage Sprint (21 SP)

| ID       | Story                                                           | SP  | Priority | Assignee |
| -------- | --------------------------------------------------------------- | --- | -------- | -------- |
| TEST-001 | Add unit tests for middleware layer (opa-abac, ingestValidator) | 5   | P0       | -        |
| TEST-002 | Add unit tests for CRUD resolvers                               | 5   | P0       | -        |
| TEST-003 | Add unit tests for GraphRAGService                              | 5   | P0       | -        |
| TEST-004 | Add integration tests for auth flow                             | 3   | P0       | -        |
| TEST-005 | Add integration tests for Neo4j operations                      | 3   | P0       | -        |

**TEST-001: Middleware Unit Tests**

```
Acceptance Criteria:
- [ ] opa-abac.test.ts with 80% coverage
- [ ] ingestValidator.test.ts with 80% coverage
- [ ] graphAbuseGuard.test.ts with 75% coverage
- [ ] All positive and negative paths tested
- [ ] Mock dependencies properly isolated

Test Cases (opa-abac):
1. Valid token with correct role → Access granted
2. Expired token → 401 Unauthorized
3. Missing token → 401 Unauthorized
4. Valid token, insufficient role → 403 Forbidden
5. Malformed token → 400 Bad Request
6. Rate limit exceeded → 429 Too Many Requests
```

### Epic 2.2: Audit Logging (13 SP)

| ID        | Story                                                                  | SP  | Priority | Assignee |
| --------- | ---------------------------------------------------------------------- | --- | -------- | -------- |
| AUDIT-001 | As a compliance officer, all mutations are logged with actor/timestamp | 5   | P1       | -        |
| AUDIT-002 | As an admin, I can query audit logs via GraphQL                        | 3   | P1       | -        |
| AUDIT-003 | As a system, audit logs are tamper-evident (hash chain)                | 3   | P1       | -        |
| AUDIT-004 | As a compliance officer, I can export audit logs in SOC 2 format       | 2   | P1       | -        |

**AUDIT-001: Comprehensive Audit Logging**

```
Acceptance Criteria:
- [ ] Every mutation emits audit event
- [ ] Audit record includes: actor, action, resource, outcome, timestamp
- [ ] Actor includes: userId, role, IP address, session ID
- [ ] Resource includes: type, ID, before/after state
- [ ] Logs stored in TimescaleDB with 7-year retention

Technical Tasks:
1. Create AuditService with EventEmitter pattern
2. Add audit interceptor to GraphQL middleware
3. Design audit table with TimescaleDB hypertable
4. Implement audit log archival job
```

### Epic 2.3: Entity Resolution (8 SP)

| ID     | Story                                                               | SP  | Priority | Assignee |
| ------ | ------------------------------------------------------------------- | --- | -------- | -------- |
| ER-001 | As a system, incoming entities are matched against existing records | 5   | P1       | -        |
| ER-002 | As a user, I can review and approve entity merge suggestions        | 3   | P1       | -        |

---

## Sprint 3: Scale & Security (Days 29-42)

**Sprint Goal**: WebSocket scaling and security audit completion

### Epic 3.1: WebSocket Scalability (13 SP)

| ID     | Story                                                                   | SP  | Priority | Assignee |
| ------ | ----------------------------------------------------------------------- | --- | -------- | -------- |
| WS-001 | As a system, WebSocket connections scale horizontally via Redis pub/sub | 8   | P1       | -        |
| WS-002 | As a user, I see presence indicators for collaborators                  | 3   | P1       | -        |
| WS-003 | As a user, concurrent edits merge without data loss (CRDT)              | 2   | P1       | -        |

**WS-001: Horizontal WebSocket Scaling**

```
Acceptance Criteria:
- [ ] 1000 concurrent WebSocket connections supported
- [ ] Multi-server deployment with Redis pub/sub
- [ ] Connection affinity via consistent hashing
- [ ] Graceful failover on server disconnect
- [ ] Message delivery guaranteed (at-least-once)

Technical Tasks:
1. Replace in-memory pub/sub with Redis Streams
2. Implement connection registry in Redis
3. Add health checks for WebSocket servers
4. Create load test with k6 for 1000 connections
```

### Epic 3.2: Security Hardening (13 SP)

| ID      | Story                                                    | SP  | Priority | Assignee |
| ------- | -------------------------------------------------------- | --- | -------- | -------- |
| SEC-001 | Pass OWASP Top 10 scan with 0 high/critical findings     | 5   | P0       | -        |
| SEC-002 | All dependencies have 0 high/critical CVEs               | 3   | P0       | -        |
| SEC-003 | Secret scanning in CI blocks PRs with leaked credentials | 2   | P0       | -        |
| SEC-004 | Implement field-level encryption for PII                 | 3   | P1       | -        |

**SEC-001: OWASP Compliance**

```
Acceptance Criteria:
- [ ] ZAP scan shows 0 high/critical vulnerabilities
- [ ] SQL injection tests pass (parameterized queries)
- [ ] XSS tests pass (output encoding)
- [ ] CSRF protection active on all mutations
- [ ] Authentication bypass tests fail (secure)

Technical Tasks:
1. Run ZAP baseline scan
2. Fix all critical/high findings
3. Add ZAP to CI pipeline
4. Document security controls
```

### Epic 3.3: Performance Testing (8 SP)

| ID       | Story                             | SP  | Priority | Assignee |
| -------- | --------------------------------- | --- | -------- | -------- |
| PERF-001 | API p95 latency <200ms under load | 5   | P0       | -        |
| PERF-002 | Database queries p99 <500ms       | 3   | P1       | -        |

---

## Sprint 4: Launch Ready (Days 43-60)

**Sprint Goal**: E2E testing, documentation, and final hardening

### Epic 4.1: E2E Test Suite (13 SP)

| ID      | Story                                         | SP  | Priority | Assignee |
| ------- | --------------------------------------------- | --- | -------- | -------- |
| E2E-001 | New user onboarding journey tested end-to-end | 2   | P0       | -        |
| E2E-002 | Entity import to graph view journey tested    | 2   | P0       | -        |
| E2E-003 | Investigation workflow journey tested         | 3   | P0       | -        |
| E2E-004 | AI query to citation view journey tested      | 3   | P0       | -        |
| E2E-005 | Collaboration and sharing journey tested      | 3   | P0       | -        |

**E2E-003: Investigation Workflow**

```
Acceptance Criteria:
- [ ] User can create new investigation
- [ ] User can add entities from search
- [ ] User can link entities with relationships
- [ ] User can save and reload investigation
- [ ] User can share with team member
- [ ] User can export investigation report

Playwright Script Outline:
1. Login as test user
2. Click "New Investigation"
3. Search for "John Doe" entity
4. Add entity to canvas
5. Search for "ACME Corp" entity
6. Add and link to John Doe
7. Save investigation
8. Reload page and verify state
9. Click Share and invite collaborator
10. Export PDF and verify download
```

### Epic 4.2: Documentation (8 SP)

| ID      | Story                                | SP  | Priority | Assignee |
| ------- | ------------------------------------ | --- | -------- | -------- |
| DOC-001 | API reference updated for v4.0.0     | 3   | P1       | -        |
| DOC-002 | Runbooks created for all P0 alerts   | 3   | P1       | -        |
| DOC-003 | Release notes generated from commits | 2   | P1       | -        |

### Epic 4.3: Final Hardening (13 SP)

| ID       | Story                                  | SP  | Priority | Assignee |
| -------- | -------------------------------------- | --- | -------- | -------- |
| HARD-001 | All P0 bugs closed (0 open)            | 5   | P0       | -        |
| HARD-002 | Test coverage at 70%                   | 3   | P0       | -        |
| HARD-003 | Load test passes: 500 concurrent users | 3   | P0       | -        |
| HARD-004 | Lighthouse customer pilot completed    | 2   | P0       | -        |

---

## Backlog Summary

| Sprint    | Story Points | Epic Focus                              |
| --------- | ------------ | --------------------------------------- |
| Sprint 1  | 42 SP        | Graph Perf, RAG Safety, Critical Bugs   |
| Sprint 2  | 42 SP        | Test Coverage, Audit, Entity Resolution |
| Sprint 3  | 34 SP        | WebSocket Scale, Security, Load Test    |
| Sprint 4  | 34 SP        | E2E Tests, Docs, Final Hardening        |
| **Total** | **152 SP**   |                                         |

**Estimated Duration**: 8 weeks (4 sprints x 2 weeks) with 2 developers

---

## Dependencies & Risks

### External Dependencies

- Neo4j GDS plugin availability
- OpenAI/Anthropic API stability
- Redis cluster for WebSocket scaling

### Technical Risks

| Risk                                | Likelihood | Impact | Mitigation                     |
| ----------------------------------- | ---------- | ------ | ------------------------------ |
| WebGL not supported on all browsers | Low        | Medium | Fallback to Canvas renderer    |
| LLM rate limits during load test    | Medium     | High   | Mock LLM for load tests        |
| Neo4j query timeouts on supernodes  | High       | High   | Pre-computation + query limits |
| Flaky tests block merge queue       | Medium     | Medium | Quarantine mechanism           |

---

## Definition of Done

- [ ] Code reviewed and approved
- [ ] Unit tests pass (>70% coverage on touched files)
- [ ] Integration tests pass
- [ ] No linting errors
- [ ] Documentation updated (if API changed)
- [ ] Deployed to staging
- [ ] QA verified (for P0 stories)
