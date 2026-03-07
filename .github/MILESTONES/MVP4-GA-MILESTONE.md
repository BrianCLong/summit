# MVP-4-GA Milestone: Ironclad Standard

**Target Date**: 60 days from sprint start
**Decision Authority**: Release Captain + Engineering Council

---

## Milestone Overview

This milestone tracks all work required for the MVP-4-GA (v4.0.0) release. The release transforms Summit from a feature-complete MVP to a production-hardened enterprise platform.

**Theme**: Operational Determinism - "If it isn't automated, enforced, and provenanced, it doesn't exist in v4."

---

## Issue Labels for This Milestone

```
mvp-4-ga           # Primary milestone label
p0-blocker         # Cannot ship without this
p1-required        # Required for enterprise customers
p2-nice-to-have    # Can slip to v4.1

area:graph         # Graph visualization
area:graphrag      # AI/RAG functionality
area:security      # Security hardening
area:testing       # Test coverage
area:performance   # Performance optimization
area:compliance    # Audit/compliance features
```

---

## P0 Blockers (Must Fix Before ANY Customer)

### 1. Graph Performance - Hairball Fix

**Label**: `p0-blocker`, `area:graph`

```markdown
## Problem

Large graphs (>5K nodes) cause browser freezing and memory exhaustion.

## Acceptance Criteria

- [ ] 50K nodes render in <1 second
- [ ] 30+ FPS maintained during interaction
- [ ] Memory usage <2GB for 50K nodes
- [ ] WebGL renderer for large graphs
- [ ] Viewport culling implemented

## Technical Approach

1. Integrate WebGL-based renderer (Sigma.js)
2. Implement progressive loading with batching
3. Add LOD (Level-of-Detail) controls
4. Enable viewport culling for off-screen elements

## Test Plan

- [ ] Benchmark suite with 10K, 50K, 100K nodes
- [ ] Memory profiling under sustained load
- [ ] FPS measurement during pan/zoom
```

### 2. Supernode Query Optimization

**Label**: `p0-blocker`, `area:graph`

```markdown
## Problem

Queries involving popular entities (>1000 connections) timeout.

## Acceptance Criteria

- [ ] Supernode queries complete in <2s
- [ ] Automatic pagination for large results
- [ ] Pre-computed aggregations for top supernodes
- [ ] User warning for expensive queries

## Technical Approach

1. Add connection_count index to Neo4j
2. Implement query planner with supernode detection
3. Create pagination wrapper for traversals
4. Background job for supernode pre-computation
```

### 3. GraphRAG Hallucination Guardrails

**Label**: `p0-blocker`, `area:graphrag`

```markdown
## Problem

AI makes confident assertions without citations, creating trust/liability issues.

## Acceptance Criteria

- [ ] Every factual claim has entity/evidence citation
- [ ] Confidence scores displayed (0-100%)
- [ ] Low-confidence warnings shown
- [ ] Uncited claims flagged visually
- [ ] Citation links are clickable

## Technical Approach

1. Enhance citation-gate.ts validation
2. Implement citation extraction in LLM response parser
3. Add confidence scoring model
4. Create CitationDisplay component
```

### 4. Test Coverage 70%

**Label**: `p0-blocker`, `area:testing`

```markdown
## Problem

Current test coverage (~22%) is insufficient for production confidence.

## Acceptance Criteria

- [ ] 70% overall line coverage
- [ ] 80% coverage on P0 modules
- [ ] Zero flaky tests
- [ ] Coverage gates in CI
- [ ] All tests pass in <5 minutes

## Test Priority

1. Middleware (auth, validation, abuse guard)
2. CRUD resolvers
3. GraphRAGService
4. Financial services
5. AI governance
```

### 5. API Determinism

**Label**: `p0-blocker`, `area:security`

```markdown
## Problem

Some 500 errors on malformed input; need typed error responses.

## Acceptance Criteria

- [ ] All inputs produce 4xx or typed errors (never 500)
- [ ] Global error handler catches all exceptions
- [ ] Error responses include error code + message
- [ ] Zod validation on all mutations
- [ ] No unhandled promise rejections
```

### 6. Security Audit Pass

**Label**: `p0-blocker`, `area:security`

```markdown
## Problem

Need verified security posture before enterprise customers.

## Acceptance Criteria

- [ ] OWASP Top 10 scan: 0 high/critical
- [ ] Dependency audit: 0 high/critical CVEs
- [ ] Secret scanning active in CI
- [ ] Penetration test passed (if budget)
- [ ] CSP headers configured
```

---

## P1 Required (Enterprise Blockers)

### 7. Audit Logging

**Label**: `p1-required`, `area:compliance`

```markdown
## Problem

No comprehensive audit trail for SOC 2 compliance.

## Acceptance Criteria

- [ ] All mutations logged with actor/timestamp
- [ ] Audit logs queryable via GraphQL
- [ ] Tamper-evident logging (hash chains)
- [ ] 7-year retention policy
- [ ] SOC 2 export format
```

### 8. WebSocket Horizontal Scaling

**Label**: `p1-required`, `area:performance`

```markdown
## Problem

Single-server WebSocket limits concurrent collaboration to ~50 users.

## Acceptance Criteria

- [ ] 1000 concurrent WebSocket connections
- [ ] Redis pub/sub for multi-server
- [ ] Graceful failover on disconnect
- [ ] Presence indicators working
- [ ] CRDT-based conflict resolution
```

### 9. Entity Resolution Pipeline

**Label**: `p1-required`, `area:graph`

```markdown
## Problem

Duplicate entities proliferate without fuzzy matching.

## Acceptance Criteria

- [ ] Fuzzy matching on entity ingest
- [ ] Similarity scoring for matches
- [ ] Human review queue for ambiguous cases
- [ ] Merge/split entity workflows
- [ ] Deduplication reports
```

### 10. Field-Level Encryption

**Label**: `p1-required`, `area:security`

```markdown
## Problem

PII stored in plaintext; blocks CJIS/FedRAMP.

## Acceptance Criteria

- [ ] PII fields encrypted at rest
- [ ] Encryption keys in AWS KMS or Vault
- [ ] Key rotation capability
- [ ] Audit log for key access
- [ ] Decryption only with valid session
```

---

## P2 Nice-to-Have (Can Slip)

### 11. One-Click Release to Staging

**Label**: `p2-nice-to-have`, `area:devops`

```markdown
Automate the staging deployment process with a single button in CI.
```

### 12. Mobile-Responsive Graph View

**Label**: `p2-nice-to-have`, `area:graph`

```markdown
Optimize graph visualization for tablet/phone viewports.
```

### 13. Docs Generated from Code

**Label**: `p2-nice-to-have`, `area:docs`

```markdown
Auto-generate API docs from GraphQL schema and JSDoc comments.
```

---

## Milestone Checklist

### Week 1-2 (Sprint 1)

- [ ] GRAPH-001: 10K+ node rendering
- [ ] GRAPH-002: Progressive loading
- [ ] GRAPH-003: Supernode optimization
- [ ] RAG-001: Citation enforcement
- [ ] RAG-002: Confidence scoring
- [ ] Critical bug fixes

### Week 3-4 (Sprint 2)

- [ ] TEST-001: Middleware tests (80% coverage)
- [ ] TEST-002: CRUD resolver tests
- [ ] TEST-003: GraphRAGService tests
- [ ] AUDIT-001: Audit logging
- [ ] ER-001: Entity resolution

### Week 5-6 (Sprint 3)

- [ ] WS-001: WebSocket scaling
- [ ] SEC-001: OWASP scan pass
- [ ] SEC-002: CVE remediation
- [ ] PERF-001: p95 <200ms

### Week 7-8 (Sprint 4)

- [ ] E2E test suite complete
- [ ] Documentation updated
- [ ] 70% test coverage achieved
- [ ] Load test passed (500 users)
- [ ] Lighthouse customer pilot

---

## Sign-Off Criteria

Before closing this milestone:

- [ ] **Product**: All P0/P1 acceptance criteria met
- [ ] **Engineering**: 70% test coverage, 0 flaky tests
- [ ] **Security**: OWASP pass, 0 high/critical CVEs
- [ ] **SRE**: Load test pass, runbooks complete
- [ ] **Release Captain**: All evidence artifacts linked

---

## GitHub CLI Commands

```bash
# Create the milestone
gh api repos/:owner/:repo/milestones -f title="MVP-4-GA: Ironclad Standard" -f due_on="2025-03-01T00:00:00Z" -f description="Production-hardened enterprise release"

# Add labels
gh label create "mvp-4-ga" --color "0052CC" --description "MVP 4.0 GA milestone"
gh label create "p0-blocker" --color "B60205" --description "Cannot ship without this"
gh label create "p1-required" --color "D93F0B" --description "Required for enterprise"
gh label create "p2-nice-to-have" --color "FBCA04" --description "Can slip to v4.1"

# Create issues from this document
gh issue create --title "[MVP4-GAP]: Graph Performance - Hairball Fix" --label "mvp-4-ga,p0-blocker,area:graph" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Supernode Query Optimization" --label "mvp-4-ga,p0-blocker,area:graph" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: GraphRAG Hallucination Guardrails" --label "mvp-4-ga,p0-blocker,area:graphrag" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Test Coverage 70%" --label "mvp-4-ga,p0-blocker,area:testing" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: API Determinism" --label "mvp-4-ga,p0-blocker,area:security" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Security Audit Pass" --label "mvp-4-ga,p0-blocker,area:security" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Audit Logging" --label "mvp-4-ga,p1-required,area:compliance" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: WebSocket Horizontal Scaling" --label "mvp-4-ga,p1-required,area:performance" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Entity Resolution Pipeline" --label "mvp-4-ga,p1-required,area:graph" --milestone "MVP-4-GA: Ironclad Standard"
gh issue create --title "[MVP4-GAP]: Field-Level Encryption" --label "mvp-4-ga,p1-required,area:security" --milestone "MVP-4-GA: Ironclad Standard"
```
