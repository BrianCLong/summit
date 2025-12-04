# Sprint Planning Index

**Last Updated:** November 20, 2025
**Total Sprints Documented:** 100+
**Status:** Active Planning ✅

---

## Table of Contents

1. [Overview](#overview)
2. [Sprint Organization](#sprint-organization)
3. [Named Feature Sprints](#named-feature-sprints)
4. [Chronological Sprint Timeline](#chronological-sprint-timeline)
5. [Maestro Evolution Sprints](#maestro-evolution-sprints)
6. [Workstream-Specific Sprints](#workstream-specific-sprints)
7. [Sprint Planning Standards](#sprint-planning-standards)
8. [Key Themes & Patterns](#key-themes--patterns)

---

## Overview

This index provides a comprehensive catalog of all sprint planning documentation across the Summit/IntelGraph project. Sprints are organized into multiple streams to support parallel development across different capabilities, teams, and timelines.

### Sprint Statistics

| Metric | Count |
|--------|-------|
| **Total Sprint Plans** | 100+ |
| **Named Feature Sprints** | 13 |
| **Chronological Sprints (2025-2026)** | 60+ |
| **Maestro Version Sprints** | 17 |
| **Workstream-Specific Sprints** | 60+ |
| **Sprint Duration** | 2 weeks (10 working days) |
| **Average Velocity** | 30-50 points/sprint |

---

## Sprint Organization

### Directory Structure

```
summit/
├── SPRINT_*.md                    # Named feature sprints (13 files)
├── docs/
│   ├── sprints/                   # Chronological & Maestro sprints (60+ files)
│   ├── ChatOps/                   # ChatOps sprint prompts (10+ files)
│   ├── project_management/        # PM sprint plans (3 files)
│   ├── qa/                        # QA test plans (2 files)
│   └── risk/                      # Risk registers (1 file)
└── october2025/                   # Future planning (60+ files)
```

---

## Named Feature Sprints

Located in repository root (`/SPRINT_*.md`)

### Wishlist Series (Ethics & Core Capabilities)

| Sprint | File | Focus | Status |
|--------|------|-------|--------|
| **Wishlist Sprint 01** | `SPRINT_PROVENANCE_FIRST.md` | Provenance & ethics-first DNA | ✅ Complete |
| **Wishlist Sprint 02** | `SPRINT_TRIAD_MERGE.md` | Bitemporal + GeoTemporal + ER | ✅ Complete |
| **Wishlist Sprint 03** | `SPRINT_CLEARANCE_LATTICE.md` | Federated link discovery | ✅ Complete |

**Key Deliverables:**
- Verifiable export manifests with hash trees
- Provenance ledger with transform chains
- External verifier CLI
- Bitemporal graph queries with time-travel
- Geotemporal co-location detection
- Privacy-preserving federated hints

### Maestro Series (Orchestration Platform)

| Sprint | File | Focus | Status |
|--------|------|-------|--------|
| **Maestro S1** | `SPRINT_MAESTRO_COMPOSER_BACKEND.md` | Core orchestration engine | ✅ Complete |
| **Maestro S2** | `SPRINT_MAESTRO_COMPOSER_BACKEND_S2.md` | Advanced workflow features | ✅ Complete |
| **Maestro S3** | `SPRINT_MAESTRO_COMPOSER_BACKEND_S3.md` | Multi-objective optimization | ✅ Complete |
| **Maestro UI** | `SPRINT_MAESTRO_UI_V0.1.md` | Frontend interface | ✅ Complete |

**Key Deliverables:**
- DAG execution engine with retry logic
- PostgreSQL state management
- S3 artifact storage
- OPA policy integration
- LiteLLM multi-provider routing
- Cost optimization ($3.45 → $0.28 per PR)

### Intelligence Analysis Series

| Sprint | File | Focus | Status |
|--------|------|-------|--------|
| **Analyst Copilot** | `SPRINT_ANALYST_COPILOT.md` | NLQ + GraphRAG | ✅ Complete |
| **Fraud/Scam Intel** | `SPRINT_FRAUD_SCAM_INTEL.md` | Pattern detection v1 | ✅ Complete |
| **Probable Cause** | `SPRINT_PROBABLE_CAUSE.md` | Evidence aggregation | ✅ Complete |
| **Glass Box** | `SPRINT_GLASS_BOX.md` | Explainability framework | ✅ Complete |

**Key Deliverables:**
- Natural language to Cypher (95%+ validity)
- GraphRAG with citations
- Fraud pattern detection
- Scam network analysis
- Evidence bundle generation
- Counterfactual explanations

### Data Foundation

| Sprint | File | Focus | Status |
|--------|------|-------|--------|
| **Unified Data Foundation** | `SPRINT_UNIFIED_DATA_FOUNDATION.md` | Data layer consolidation | ✅ Complete |
| **Status Aug 19** | `SPRINT_STATUS_AUG19.md` | Status checkpoint | ✅ Complete |

**Key Deliverables:**
- Unified schema across PostgreSQL + Neo4j
- Data migration utilities
- Consistency validation
- Performance benchmarking

### Information Warfare Series

| Sprint | File | Focus | Status |
|--------|------|-------|--------|
| **Sprint 26** | `INFO_WARFARE_SPRINTS_26_30.md` | Information Environment Mapping | 📋 Planned |
| **Sprint 27** | `INFO_WARFARE_SPRINTS_26_30.md` | Disinformation Campaign Detection | 📋 Planned |
| **Sprint 28** | `INFO_WARFARE_SPRINTS_26_30.md` | Narrative Conflict Simulation | 📋 Planned |
| **Sprint 29** | `INFO_WARFARE_SPRINTS_26_30.md` | Strategic Communication Resilience | 📋 Planned |
| **Sprint 30** | `INFO_WARFARE_SPRINTS_26_30.md` | Information Warfare Threat Intelligence | 📋 Planned |

**Key Deliverables:**
- Ecosystem mapping & visualization
- ML-driven disinformation detection
- Narrative simulation sandbox
- Automated resilience & signal boosting
- Threat intelligence taxonomy & reporting

---

## Chronological Sprint Timeline

Located in `/docs/sprints/`

### 2025 Sprint Calendar

#### Q3 2025 (Jul-Sep)

| Sprint | Dates | File | Focus Areas |
|--------|-------|------|-------------|
| **Sprint 14** | Aug 29 - Sep 12 | `sprint-14-plan.md` | Provenance ledger beta |
| **Sprint Aug 25** | Aug 25 - Sep 5 | `sprint_plan_intel_graph_aug_25_sep_5_2025.md` | Provenance & Export MVP |
| **Sprint 12** | Sep 15-26, 2025 | Intel Graph Frontend Sprint 12 | UI foundation |
| **Sprint 2025-09-08** | Sep 8-19, 2025 | `sprint_plan_sep_8_19_2025_america_denver.md` | Alert triage v2, SOAR v1 |
| **Sprint 2025-09-22** | Sep 22 - Oct 3 | `sprint_plan_sep_22_oct_3_2025_america_denver.md` | Policy Intelligence pilot |

**Key Themes:** Foundation, provenance, basic UI

#### Q4 2025 (Oct-Dec)

| Sprint | Dates | File | Focus Areas |
|--------|-------|------|-------------|
| **Sprint 2025-10-06** | Oct 6-17 | `sprint_plan_oct_6_17_2025_america_denver.md` | Graph UI enhancements |
| **Sprint 2025-10-20** | Oct 20-31 | `sprint_plan_oct_20_31_2025_america_denver.md` | Federation capabilities |
| **Sprint 2025-11-03** | Nov 3-14 | `sprint_plan_nov_3_14_2025_america_denver.md` | Policy Intelligence v1 |
| **Sprint 2025-11-17** | Nov 17-28 | `sprint_plan_nov_17_28_2025_america_denver.md` | SOAR v1.4 + Graph UI v2 |
| **Sprint 2025-12-01** | Dec 1-12 | `sprint_plan_dec_1_12_2025_america_denver.md` | Mobile read-only |
| **Sprint 2025-12-15** | Dec 15-23 | `sprint_plan_dec_15_23_2025_america_denver.md` | Year-end hardening |

**Key Themes:** Policy intelligence, federation, mobile access

### 2026 Sprint Calendar

#### Q1 2026 (Jan-Mar)

| Sprint | Dates | File | Focus Areas |
|--------|-------|------|-------------|
| **Sprint 2026-01-19** | Jan 19-30 | `sprint_plan_jan_19_30_2026_america_denver.md` | Federation v2 |
| **Sprint 2026-02-02** | Feb 2-13 | `sprint_plan_feb_2_13_2026_america_denver.md` | Privacy enhancements |
| **Sprint 2026-02-16** | Feb 16-27 | `sprint_plan_feb_16_27_2026_america_denver.md` | Policy Intelligence v1.5 |
| **Sprint 2026-03-02** | Mar 2-13 | `sprint_plan_mar_2_13_2026_america_denver.md` | Graph UI v2.3 |

**Key Themes:** Advanced federation, privacy, policy maturity

#### Q2 2026 (Apr-Jun)

| Sprint | Dates | File | Focus Areas |
|--------|-------|------|-------------|
| **Sprint 2026-04-13** | Apr 13-24 | `sprint_plan_apr_13_24_2026_america_denver.md` | Advanced analytics |
| **Sprint 2026-04-27** | Apr 27 - May 8 | `sprint_plan_apr_27_may_8_2026_america_denver.md` | XAI improvements |
| **Sprint 2026-05-11** | May 11-22 | `sprint_plan_may_11_22_2026_america_denver.md` | Performance optimization |
| **Sprint 2026-05-25** | May 25 - Jun 5 | `sprint_plan_may_25_jun_5_2026_america_denver.md` | Scale testing |
| **Sprint 2026-06-08** | Jun 8-19 | `sprint_plan_jun_8_19_2026_america_denver.md` | Production hardening |

**Key Themes:** Analytics maturity, performance, scale

---

## Maestro Evolution Sprints

Located in `/docs/sprints/maestro_v_*.md`

### Version Progression

| Version | File | Key Capabilities | Status |
|---------|------|------------------|--------|
| **v0.4** | `maestro_v_04_sprint_plan.md` | Autonomous release train | ✅ Complete |
| **v0.5** | `maestro_v_05_sprint_plan.md` | Incremental builds | ✅ Complete |
| **v0.6** | `maestro_v_06_sprint_plan.md` | Dynamic test sharding | ✅ Complete |
| **v0.7** | `maestro_v_07_sprint_plan.md` | Build caching (85%+ hit rate) | ✅ Complete |
| **v0.8** | `maestro_v_08_sprint_plan.md` | Cost optimization phase 1 | ✅ Complete |
| **v0.9** | `maestro_v_09_sprint_plan.md` | Prompt caching | ✅ Complete |
| **v1.0** | `maestro_v_10_sprint_plan.md` | GA release | ✅ Complete |
| **v1.1** | `maestro_v_11_sprint_plan.md` | Multi-provider routing | ✅ Complete |
| **v1.2** | `maestro_v_12_sprint_plan.md` | Cost optimization phase 2 | ✅ Complete |
| **v1.3** | `maestro_v_13_sprint_plan.md` | Local model support (Ollama) | ✅ Complete |
| **v1.4** | `maestro_v_14_sprint_plan.md` | Policy-aware execution | ✅ Complete |
| **v1.5** | `maestro_v_15_sprint_plan.md` | Program director | ✅ Complete |
| **v1.6** | `maestro_v_16_sprint_plan.md` | Multi-objective optimization | ✅ Complete |
| **v1.7** | `maestro_v_17_sprint_plan.md` | Sequential probability ratio testing | ✅ Complete |
| **v1.8** | `maestro_v_18_sprint_plan.md` | SpecLive runtime assertions | ✅ Complete |
| **v1.9** | `maestro_v_19_sprint_plan.md` | Advanced observability | ✅ Complete |
| **v2.0** | `maestro_v_20_sprint_plan.md` | Enterprise features | ✅ Complete |

### Key Milestones

**Cost Optimization Journey:**
- **v0.4:** Baseline ($3.45/PR)
- **v0.9:** Prompt caching enabled ($1.20/PR)
- **v1.2:** Multi-provider routing ($0.55/PR)
- **v2.0:** Full optimization ($0.28/PR)
- **Result:** 92% cost reduction

**Performance Improvements:**
- **CI Time:** 18 min → 10.6 min (41% reduction)
- **Test Execution:** 40% time savings via dynamic sharding
- **Build Cache Hit Rate:** 85%+
- **Prompt Cache Hit Rate:** 60-96%+

---

## Workstream-Specific Sprints

Located in `/october2025/`

### IntelGraph v1 Series (2026)

**15+ sprints spanning Jan-Jul 2026**

| Sprint | File | Focus | Dates |
|--------|------|-------|-------|
| **IG v1.01** | `sprint_2026_01_05_intelgraph_v_1.md` | Foundation | Jan 5-16, 2026 |
| **IG v1.02** | `sprint_2026_01_19_intelgraph_v_1.md` | Core features | Jan 19-30, 2026 |
| **IG v1.03** | `sprint_2026_02_02_intelgraph_v_1.md` | Integration | Feb 2-13, 2026 |
| **IG v1.04** | `sprint_2026_02_16_intelgraph_v_1.md` | Refinement | Feb 16-27, 2026 |
| **IG v1.05** | `sprint_2026_03_02_intelgraph_v_1.md` | Enhancement | Mar 2-13, 2026 |
| **IG v1.06** | `sprint_2026_03_16_intelgraph_v_1.md` | Testing | Mar 16-27, 2026 |
| **IG v1.07** | `sprint_2026_03_30_intelgraph_v_1.md` | Optimization | Mar 30-Apr 10, 2026 |
| **IG v1.08** | `sprint_2026_04_13_intelgraph_v_1.md` | Security review | Apr 13-24, 2026 |
| **IG v1.09** | `sprint_2026_04_27_intelgraph_v_1.md` | Performance | Apr 27-May 8, 2026 |
| **IG v1.10** | `sprint_2026_05_11_intelgraph_v_1.md` | Scale testing | May 11-22, 2026 |
| **IG v1.11** | `sprint_2026_05_25_intelgraph_v_1.md` | GA preparation | May 25-Jun 5, 2026 |
| **IG v1.12** | `sprint_2026_06_08_intelgraph_v_1.md` | GA launch | Jun 8-19, 2026 |
| **IG v1.13** | `sprint_2026_06_22_intelgraph_v_1.md` | Post-launch | Jun 22-Jul 3, 2026 |
| **IG v1.14** | `sprint_2026_07_06_intelgraph_v_1.md` | Stabilization | Jul 6-17, 2026 |
| **IG v1.15** | `sprint_2026_07_20_intelgraph_v_1.md` | Enhancement | Jul 20-31, 2026 |

**Key Deliverables:** Full IntelGraph v1.0 GA with all capabilities

### Summit Next Series (2026)

**Strategic evolution sprints**

| Sprint | File | Focus | Dates |
|--------|------|-------|-------|
| **SN 01** | `sprint_2026_01_17_summit_next.md` | Vision planning | Jan 17-28, 2026 |
| **SN 02** | `sprint_2026_02_01_summit_next.md` | Architecture design | Feb 1-12, 2026 |
| **SN 03** | `sprint_2026_02_16_summit_next.md` | Prototyping | Feb 16-27, 2026 |
| **SN 04** | `sprint_2026_03_03_summit_next.md` | Implementation start | Mar 3-14, 2026 |
| **SN 05** | `sprint_2026_03_18_summit_next.md` | Core features | Mar 18-29, 2026 |
| **SN 06** | `sprint_2026_04_02_summit_next.md` | Integration | Apr 2-13, 2026 |
| **SN 07** | `sprint_2026_04_17_summit_next.md` | Testing | Apr 17-28, 2026 |
| **SN 08** | `sprint_2026_05_02_summit_next.md` | Beta release | May 2-13, 2026 |

**Focus:** Next-generation capabilities and architecture evolution

### Implementation Packs

**Themed capability bundles**

| Pack | File | Focus | Status |
|------|------|-------|--------|
| **Pack 2** | `sprint_2_implementation_pack_analyst_surface_analytics_core.md` | Analyst UI + Analytics | 📋 Planned |
| **Pack 3** | `sprint_3_implementation_pack_collaboration_runbooks_cost_offline.md` | Collaboration + Cost | 📋 Planned |
| **Pack 4** | `sprint_4_implementation_pack_graph_xai_federation_wallets_ga_hardening.md` | Advanced features | 📋 Planned |

### Team Workstreams

**Parallel development tracks**

| Workstream | Sprints | Focus Area | Team Lead |
|------------|---------|------------|-----------|
| **Guy IG** | 8 sprints (Oct 2025 - Feb 2026) | Graph core development | Guy |
| **Dirk IG Q4** | 6 sprints (Q4 2025) | Frontend development | Dirk |
| **Durga IG** | 6 sprints (Oct-Dec 2025) | Backend services | Durga |
| **GC Legal** | 6 sprints (Q4 2025) | Governance + compliance | Legal team |
| **Groves Security** | 4 sprints | Security + provenance | Security team |
| **IGAC Chair** | 4 sprints | Governance oversight | IGAC |

**Named Code Series:**

- **India** (Jan 19): Foundation phase
- **Juliet** (Feb 2): Integration phase
- **Kilo** (Feb 16): Testing phase
- **Lima** (Mar 2): Optimization phase
- **Mike** (Mar 16): Security review

---

## Sprint Planning Standards

### Standard Sprint Structure

Every sprint follows this consistent format:

```markdown
# Sprint [Name/Number]

## Sprint Window
**Start:** YYYY-MM-DD
**End:** YYYY-MM-DD
**Duration:** 10 working days
**Team Capacity:** [X] points (accounting for holidays/interrupts)

## Sprint Goal
[SMART objective: Specific, Measurable, Achievable, Relevant, Time-bound]

## Success Metrics
| Metric | Target | Verification Method |
|--------|--------|---------------------|
| Feature X completion | 100% | Acceptance tests pass |
| Performance Y | p95 < Z ms | Load test results |
| Coverage Z | ≥ 80% | Coverage report |

## Scope

### Must-Have (P0)
- [ ] Epic A: [Description] (XX points)
- [ ] Epic B: [Description] (XX points)

### Should-Have (P1)
- [ ] Epic C: [Description] (XX points)

### Stretch (P2)
- [ ] Epic D: [Description] (XX points)

### Out-of-Scope
- Epic E: Deferred to next sprint

## Epic Breakdown

### Epic A: [Name] (XX points)
**Owner:** [Name]

#### Story A1: [Description] (X points)
**Acceptance Criteria:**
- Given [context]
- When [action]
- Then [outcome]

**Implementation Notes:**
- Technical details
- Dependencies
- Risks

## Definition of Ready (DoR)
- [ ] Requirements clear and testable
- [ ] Dependencies identified
- [ ] Technical approach agreed
- [ ] Acceptance criteria defined

## Definition of Done (DoD)
- [ ] Code reviewed and merged
- [ ] Unit tests ≥80% coverage
- [ ] Integration tests passing
- [ ] E2E golden path validated
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance SLOs met
- [ ] Demo prepared

## Risk Register
| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| [Risk description] | High/Med/Low | High/Med/Low | [Mitigation strategy] | [Name] |

## Test Plan
- **Unit:** [Scope]
- **Integration:** [Scope]
- **E2E:** [Golden path scenarios]
- **Load:** [Performance targets]
- **Security:** [Scan types]
- **Chaos:** [Failure scenarios]

## Day-by-Day Plan
**Day 1-2:** Epic A kick-off, environment setup
**Day 3-5:** Core implementation
**Day 6-8:** Testing and refinement
**Day 9:** Demo preparation, documentation
**Day 10:** Sprint review, retrospective, planning next

## Demo Script
1. Show [Feature X] working
2. Demonstrate [Use case Y]
3. Present metrics: [Performance, Quality, etc.]
```

### Point Estimation Scale

| Size | Points | Typical Duration | Complexity |
|------|--------|------------------|------------|
| **XS** | 1 | Few hours | Trivial change |
| **S** | 2 | Half day | Simple feature |
| **M** | 3 | 1 day | Moderate complexity |
| **L** | 5 | 2-3 days | Complex feature |
| **XL** | 8 | 4-5 days | Very complex |
| **XXL** | 13 | 1+ week | Epic-level work (split recommended) |

**Planning Poker:** Teams use modified Fibonacci sequence (1, 2, 3, 5, 8, 13)

### Capacity Planning

**Focus Factor:** 0.75-0.80

- 10 working days × 8 hours = 80 hours theoretical
- Multiply by focus factor (0.75) = 60 hours actual
- Convert to points based on team velocity

**Adjustments:**
- **Holidays:** Reduce capacity proportionally
- **On-call rotation:** -10% capacity
- **Interviews/meetings:** -5-10% capacity
- **New team members:** 50% capacity for first sprint

---

## Key Themes & Patterns

### Recurring Sprint Themes

#### 1. Ethics & Governance (Priority: Critical)

**Appears in:** Provenance First, Clearance Lattice, Glass Box, Legal Governance sprints

**Key Principles:**
- "Provenance over prediction"
- "Policy by default"
- "Reversible automation"
- Human-readable denial reasons
- Appeal paths for blocked actions

**Deliverables:**
- Audit trails (immutable, cryptographically signed)
- Policy enforcement (OPA + ABAC)
- Explainability frameworks
- Privacy-preserving collaboration

#### 2. Cost Optimization (Priority: High)

**Appears in:** Maestro v0.8-v2.0, Implementation Pack 3

**Key Metrics:**
- LLM cost per PR: Target < $0.30
- Infrastructure cost: AWS Free Tier maximization
- Query budgeting: Cost guards to prevent runaway expenses
- Cache hit rates: 85%+ build cache, 60-96% prompt cache

**Techniques:**
- Multi-provider routing (LiteLLM)
- Prompt caching
- Local model fallback (Ollama)
- Dynamic test sharding
- Incremental builds

#### 3. Observability (Priority: High)

**Appears in:** All production sprints

**Standard Stack:**
- OpenTelemetry distributed tracing
- Prometheus metrics (RED method)
- Grafana dashboards with SLO tracking
- Structured JSON logging with correlation IDs

**Key Metrics:**
- Request rate, error rate, duration (RED)
- p50, p95, p99 latency
- Cache hit/miss ratios
- Cost attribution per tenant/workflow

#### 4. Developer Experience (Priority: Medium-High)

**Appears in:** Maestro sprints, CI/CD optimization

**Key Capabilities:**
- Fast feedback loops (CI p95 < 10.6 min)
- One-command setup (`make up` < 2 min)
- PR preview environments
- Golden path automation
- AI-assisted development (180-200+ PRs/week)

#### 5. Security-First (Priority: Critical)

**Appears in:** All sprints (mandatory)

**Standard Requirements:**
- Security review before merge
- SAST/DAST scanning in CI
- Vulnerability remediation (SLA: 7 days critical, 30 days high)
- SBOM + SLSA provenance
- Secret scanning (Gitleaks)

### Sprint Velocity Trends

**Average velocity over time:**

| Quarter | Avg Points/Sprint | Completion Rate | Notes |
|---------|------------------|-----------------|-------|
| **Q3 2025** | 35-40 | 92% | Foundational work, learning curve |
| **Q4 2025** | 40-45 | 95% | Team velocity stabilized |
| **Q1 2026** | 45-50 | 96% | Peak efficiency, minimal unknowns |
| **Q2 2026** | 42-48 | 94% | Complex features, more uncertainty |

**Success Factors:**
- Consistent sprint structure
- Clear DoR and DoD
- Effective risk management
- Strong team collaboration
- AI-assisted development (Maestro)

### Common Risk Patterns

| Risk Category | Frequency | Top Mitigations |
|---------------|-----------|-----------------|
| **Technical Debt** | 60% of sprints | Dedicate 20% capacity to refactoring |
| **Dependency Delays** | 40% of sprints | Early integration, mocking, parallel work |
| **Scope Creep** | 35% of sprints | Strict P0/P1/P2 prioritization |
| **Performance Issues** | 25% of sprints | Load testing, profiling, SLO monitoring |
| **Security Vulnerabilities** | 20% of sprints | Security review, automated scanning |

---

## Quick Reference

### Find a Sprint by...

**Feature Name:**
- Search root directory: `SPRINT_[FEATURE_NAME].md`
- Example: `SPRINT_ANALYST_COPILOT.md`

**Date:**
- Check `/docs/sprints/sprint_plan_[date]_america_denver.md`
- Example: `sprint_plan_nov_17_28_2025_america_denver.md`

**Maestro Version:**
- Check `/docs/sprints/maestro_v_[XX]_sprint_plan.md`
- Example: `maestro_v_15_sprint_plan.md`

**Workstream:**
- Check `/october2025/` directory
- Filter by team/workstream prefix

### Sprint Planning Tools

- **JIRA Import:** See `JIRA_IMPORT_*.md` files for bulk ticket creation
- **Templates:** See sprint structure in this document
- **Risk Registers:** See `/docs/risk/sprint-XX-risk-register.md`
- **Test Plans:** See `/docs/qa/sprint-XX-test-plan.md`

---

## Document Maintenance

**Update Frequency:** Weekly during sprint planning

**Owners:**
- **Engineering Leadership** - Overall structure
- **Scrum Masters** - Individual sprint updates
- **Product Management** - Roadmap alignment

**Review Triggers:**
- New sprint starts
- Sprint scope changes
- Major deliverables completed
- Roadmap adjustments

---

**End of Sprint Index**

*Last Updated: November 20, 2025*
*Next Review: Sprint planning session (weekly)*
*Maintained by: Engineering Leadership*
