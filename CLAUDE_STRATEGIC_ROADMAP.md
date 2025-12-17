# Summit/IntelGraph Strategic Roadmap

**Generated:** 2025-11-21
**Horizon:** Q4 2025 - Q2 2026 (Two Quarters)
**Status:** Active Execution

---

## Executive Summary

This roadmap consolidates analysis from MASTER_PLANNING.md, SPRINT_INDEX.md, GOVERNANCE_README.md, TESTING_ROADMAP.md, and 100+ sprint documents into actionable parallel epics.

**Current State:** Production-ready (86% validation, 100% security score, $4K-5.5K annual cost savings achieved)

**Strategic Priority:** Strengthen foundation while expanding capabilities. Focus on Observability, Security, Test Coverage, Documentation, and Search.

---

## Key Parallel Epics (5-7 Major Initiatives)

### Epic 1: Observability & SRE Excellence
**Priority:** CRITICAL | **Owner:** Platform Team | **Points:** 55

Complete the observability stack with SLO-driven alerting and trace exemplars.

**Top 5 Next Steps:**
1. **Grafana SLO Dashboards** - Complete UID-based dashboards with p95 latency trace exemplars
2. **k6 Synthetic Monitoring** - Deploy synthetic monitors with <5min alert intervals
3. **Cost Attribution Metrics** - Per-tenant/workflow cost tracking in Prometheus
4. **OpenTelemetry Completion** - 100% trace coverage on all services
5. **Runbook Automation** - Link alerts to automated remediation via Maestro

**Success Metrics:**
- p95 latency < 200ms with trace links
- Alert-to-resolution < 15min (MTTR)
- 100% SLO coverage on critical paths

---

### Epic 2: Security & Compliance Hardening
**Priority:** CRITICAL | **Owner:** Security Team | **Points:** 65

Complete ABAC/OPA enforcement, warrant management, and immutable audit trails.

**Top 5 Next Steps:**
1. **OPA Policy Enforcement** - Enable strict mode (FEATURE_WARRANT_ENFORCEMENT=true)
2. **Warrant Lifecycle API** - Complete create/validate/revoke/usage endpoints
3. **Immutable Audit Storage** - S3 Object Lock for compliance audit logs
4. **WebAuthn Step-up MFA** - Enforce for admin operations and restricted data
5. **HSM/KMS Integration** - Move from local keys to hardware security modules

**Success Metrics:**
- 100% OPA policy coverage
- 0 security vulnerabilities (critical/high)
- SOC 2 Type II audit-ready

---

### Epic 3: Test Coverage Foundation
**Priority:** CRITICAL | **Owner:** QA/Engineering | **Points:** 80

Address critical testing gap: server 6.2%, client 7.5% coverage.

**Top 5 Next Steps:**
1. **Security Layer Tests** - 100% coverage on `server/src/security/**/*.ts` (9 files)
2. **Database & Repos Tests** - 90% coverage on `server/src/repos/**/*.ts`, `server/src/db/**/*.ts`
3. **Services Layer Tests** - Complete top 10 critical services (AuthService done)
4. **Coverage Enforcement** - Add Jest coverage thresholds to CI/CD
5. **Background Worker Tests** - Cover 13 critical worker files (trustScore, embedding, retention)

**Success Metrics:**
- Server coverage: 6.2% -> 60% (3 months)
- Security layer: 0% -> 100%
- CI coverage gates enforced

---

### Epic 4: Documentation & Developer Experience
**Priority:** HIGH | **Owner:** Engineering | **Points:** 40

Full docstring coverage and improved onboarding experience.

**Top 5 Next Steps:**
1. **TypeScript JSDoc Coverage** - Add comprehensive JSDoc to all public APIs
2. **GraphQL Schema Documentation** - Document all types, queries, mutations with descriptions
3. **API Reference Generation** - Auto-generate API docs from JSDoc/OpenAPI
4. **Onboarding Validation** - Test DEVELOPER_ONBOARDING.md with new developers
5. **Architecture Decision Records** - Complete ADRs for all major decisions

**Success Metrics:**
- 100% public API docstring coverage
- <30min bootstrap time for new developers
- All ADRs documented

---

### Epic 5: Enterprise Search Enhancement
**Priority:** HIGH | **Owner:** Search Team | **Points:** 50

Improve search quality, relevance, and performance.

**Top 3 Next Steps:**
1. **Vector Search Integration** - Complete pgvector semantic search for entities
2. **Search Quality Metrics** - Implement MRR, NDCG tracking
3. **Search UI Improvements** - Faceted filters, saved searches, search history

**Success Metrics:**
- Search p95 < 500ms
- MRR > 0.7
- User satisfaction > 4.0/5.0

---

### Epic 6: Federation & Privacy (Q1 2026)
**Priority:** MEDIUM | **Owner:** Platform Team | **Points:** 70

Cross-organization collaboration with privacy preservation.

**Top 3 Next Steps:**
1. **Federated Link Hints** - Privacy-preserving cross-tenant link discovery
2. **Differential Privacy** - Aggregate query privacy guarantees
3. **Mobile Read-Only** - iOS/Android read-only access

**Success Metrics:**
- Privacy budget enforcement
- Cross-org queries operational
- Mobile app in TestFlight/Play Store

---

### Epic 7: AI/ML Evolution
**Priority:** MEDIUM | **Owner:** ML Team | **Points:** 60

Continued LLM cost optimization and GraphRAG improvements.

**Top 3 Next Steps:**
1. **LLM Cost Guardian** - Query budgeting to prevent runaway costs (target: <$0.30/PR)
2. **Local Model Fallback** - Ollama integration for offline/cost-sensitive queries
3. **GraphRAG v2** - Multi-hop reasoning with uncertainty quantification

**Success Metrics:**
- LLM cost per PR: $0.28 maintained
- Prompt cache hit rate: >80%
- NL->Cypher accuracy: >95%

---

## Quarterly Timeline

### Q4 2025 (Nov-Dec)
| Week | Epic 1 | Epic 2 | Epic 3 | Epic 4 |
|------|--------|--------|--------|--------|
| Nov 17-28 | SLO Dashboards | OPA Strict Mode | Security Tests | JSDoc Sprint |
| Dec 1-12 | k6 Synthetics | Warrant API | Repo Tests | GraphQL Docs |
| Dec 15-23 | Cost Attribution | Audit Storage | Service Tests | API Reference |

### Q1 2026 (Jan-Mar)
| Month | Primary Focus | Secondary Focus |
|-------|---------------|-----------------|
| January | Epic 5: Search, Epic 3: Coverage Gates | Epic 6: Federation Design |
| February | Epic 6: Federated Links, Epic 2: HSM | Epic 7: GraphRAG v2 |
| March | Epic 6: Mobile, Epic 4: Onboarding | Epic 7: Local Models |

---

## Resource Allocation

| Epic | Engineering | QA | Security | DevOps |
|------|-------------|-----|----------|--------|
| Epic 1: Observability | 2 | 0 | 0 | 2 |
| Epic 2: Security | 2 | 1 | 2 | 1 |
| Epic 3: Test Coverage | 3 | 2 | 1 | 0 |
| Epic 4: Documentation | 2 | 1 | 0 | 0 |
| Epic 5: Search | 2 | 1 | 0 | 0 |
| Epic 6: Federation | 3 | 1 | 1 | 1 |
| Epic 7: AI/ML | 2 | 1 | 0 | 0 |

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test coverage velocity | High | Medium | Dedicate 2 FTEs, pair programming |
| OPA learning curve | Medium | Medium | Training, policy templates |
| Federation complexity | High | High | Phased rollout, design spikes |
| LLM cost spikes | Medium | Low | Budget alerts, fallback to local |

---

## Success Criteria

**End of Q4 2025:**
- [ ] Observability stack complete with SLO dashboards
- [ ] OPA strict mode enabled for all tenants
- [ ] Test coverage > 40% server, > 30% client
- [ ] JSDoc coverage > 50% public APIs

**End of Q1 2026:**
- [ ] Federation v1 operational
- [ ] Test coverage > 60% server, > 50% client
- [ ] Mobile read-only in beta
- [ ] HSM integration complete

---

## Document References

- **Source:** MASTER_PLANNING.md, SPRINT_INDEX.md, GOVERNANCE_README.md, TESTING_ROADMAP.md
- **Sprint Docs:** 100+ sprints in /docs/sprints/ and /october2025/
- **Architecture:** INTELGRAPH_ENGINEERING_STANDARD_V4.md

---

*Generated by Claude PM Agent | Session: pm-roadmap-execution*
