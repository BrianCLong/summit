# Technical Debt Tracking

**Last Updated:** 2026-01-20
**Source:** Technical Audit Report 2026-01-20
**Total Markers:** 2,004 TODO/FIXME + 3,375 stub implementations

---

## 🎯 Executive Summary

This repository has accumulated significant technical debt during rapid development:
- **2,004 TODO/FIXME/HACK/WIP markers**
- **3,375 stub/placeholder/mock implementations**
- **Hotspot subsystems:** conductor (53), services (39), graphql (17), maestro (8)

**Primary Risk:** Security bypasses in agent validation layer (semantic-validator.ts)

**See:** [TECHNICAL_AUDIT_REPORT_2026-01-20.md](./TECHNICAL_AUDIT_REPORT_2026-01-20.md) Section 4.3 for full analysis

---

## 🔥 Critical (P0) - Security Bypasses

### 1. Semantic Validator Stubs ⚠️ **ADDRESSED**
- **Location:** `server/src/conductor/validation/semantic-validator.ts:100-305`
- **Issue:** All safety checks return 0.0 (no validation)
- **Impact:** Agent prompt injection attacks possible
- **Status:** ✅ **MITIGATED** - Feature flag added, defaults to disabled
- **Follow-up:** Implement real validation or remove feature entirely

### 2. Feature Flag Auth Missing ✅ **FIXED**
- **Location:** `server/src/api/featureFlags.ts:83-147`
- **Issue:** Admin endpoints had no auth checks
- **Impact:** Unauthorized flag manipulation
- **Status:** ✅ **FIXED** - Auth middleware added
- **Commit:** [Pending]

---

## 🔴 High Priority (P1) - Functional Gaps

### 3. Attribution Tagging Incomplete
- **Location:** `server/src/conductor/attribution/tag-builder.ts:112-172`
- **Issue:** LLM attribution stubs (no tokenization, no provenance)
- **Impact:** Cannot prove content source (legal/IP risk)
- **Recommendation:** Implement or document limitations
- **Epic:** Epic 1 (Agent Governance)

### 4. GraphQL Resolver TODOs (17 total)
- **Examples:**
  - `server/src/graphql/resolvers/graphragResolvers.ts:175` - Missing Neo4j entity fetch
  - `server/src/graphql/watchlists.ts:1` - No shared schema package
- **Impact:** Incomplete API responses
- **Recommendation:** Audit all resolvers, prioritize by usage

### 5. OPA Integration Gaps
- **Location:** `companyos/services/tenant-api/src/middleware/authContext.ts:5,49`
- **Issue:** OPA not wired in all code paths
- **Impact:** Policy bypass possible
- **Recommendation:** Comprehensive auth audit

---

## 🟡 Medium Priority (P2) - Operational Gaps

### 6. Missing Prometheus Metrics (Multiple TODOs)
- **Locations:** `services/streaming-ingest/`, `services/ingest-adapters/`, etc.
- **Impact:** Monitoring blind spots
- **Recommendation:** Add metrics incrementally per service

### 7. Autonomous Ops Stub
- **Location:** `server/src/autonomous/PredictiveOpsService.ts:44`
- **Issue:** Queue backlog check not implemented
- **Impact:** No predictive scaling
- **Recommendation:** Prioritize if autoscaling needed

### 8. NL-to-Cypher Demo Mode
- **Location:** `server/src/ai/nl-to-cypher/nl-to-cypher.service.ts:176`
- **Issue:** No production Neo4j integration
- **Impact:** Natural language queries don't work
- **Recommendation:** Mark as experimental in docs

---

## 🟢 Low Priority (P3) - Tech Debt / Polish

### 9. Test TODOs (Skipped Tests)
- **Examples:** `server/src/__tests__/trust-center-api.test.ts:9`
- **Impact:** Incomplete coverage
- **Recommendation:** Enable tests as part of coverage initiative

### 10. Documentation TODOs
- **Examples:** Missing API docs, incomplete schemas
- **Impact:** Developer friction
- **Recommendation:** Gradual improvement during feature work

---

## 📊 Debt by Subsystem

| Subsystem | TODO Count | Criticality | Owner |
|-----------|------------|-------------|-------|
| `server/src/conductor/` | 53 | 🔴 HIGH | Agent Team |
| `server/src/services/` | 39 | 🟡 MEDIUM | Backend Team |
| `server/src/graphql/` | 17 | 🟡 MEDIUM | API Team |
| `server/src/maestro/` | 8 | 🟡 MEDIUM | Agent Team |
| `server/src/middleware/` | 4 | 🟢 LOW | Infra Team |
| `server/src/api/` | 4 | ✅ **FIXED** | API Team |

**Full Analysis:** See audit report Section 4.3

---

## 🗺️ Remediation Roadmap

### Sprint 1 (Next 2 Weeks)
- [x] ~~Add semantic validator feature flag~~ ✅ **DONE**
- [x] ~~Fix feature flag auth~~ ✅ **DONE**
- [x] ~~Document CVE exceptions~~ ✅ **DONE**
- [ ] Audit OPA policy coverage
- [ ] Triage top 50 conductor TODOs
- [ ] Create Jira tickets for P0/P1 items

### Sprint 2-3 (Weeks 3-6)
- [ ] Implement attribution tagging OR remove feature
- [ ] Fix top 10 GraphQL resolver TODOs
- [ ] Add Prometheus metrics to top 5 services
- [ ] Enable skipped tests (start with easy ones)

### Q1 2026
- [ ] Complete Epic 1 (Agent Governance) - eliminates conductor TODOs
- [ ] Refactor services subsystem (reduce from 39 TODOs)
- [ ] Comprehensive GraphQL API audit
- [ ] Reduce total TODO count by 50% (target: <1,000)

---

## 📋 Process for Managing Technical Debt

### Adding New Debt

**When is a TODO acceptable?**
1. **Short-term placeholder** during active feature development
2. **Documented future work** with Jira ticket reference
3. **Known limitation** that requires architectural change

**Required Format:**
```typescript
// TODO(JIRA-123): Description of what needs to be done
// Why: Explanation of why it's not done now
// Impact: What breaks if this isn't fixed
// Priority: P0/P1/P2/P3
```

### Reviewing Debt

**Quarterly Review:**
- Audit all TODOs/FIXMEs
- Convert to Jira tickets
- Prioritize by impact
- Assign owners

**During Sprint Planning:**
- Allocate 20% of capacity to debt reduction
- Pick highest-impact items
- Pair with feature work when possible

### Measuring Progress

**Key Metrics:**
- Total TODO count (target: <1,000 by Q2 2026)
- P0/P1 count (target: 0 P0, <10 P1)
- Test coverage (target: >80%)
- Stub implementation count (target: <1,000)

---

## 🔗 Related Resources

- [TECHNICAL_AUDIT_REPORT_2026-01-20.md](./TECHNICAL_AUDIT_REPORT_2026-01-20.md) - Full audit
- [ROADMAP.md](./ROADMAP.md) - Current priorities
- [SECURITY/cve-exceptions.md](./SECURITY/cve-exceptions.md) - CVE tracking
- [ONBOARDING.md](./ONBOARDING.md) - New developer guide

---

**Questions?** Tag #tech-debt in Slack or create GitHub issue with `technical-debt` label.
