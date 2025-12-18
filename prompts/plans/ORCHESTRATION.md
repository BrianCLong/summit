# Prompts 17-49 Orchestration Guide

> Master coordination document for the Platform Evolution Suite

## Executive Summary

This document provides orchestration guidance for executing Prompts 17-49, covering 33 prompts across 6 domains:

| Domain | Prompts | Count |
|--------|---------|-------|
| Performance & Reliability | 17-25 | 9 |
| Security & Compliance | 26-30 | 5 |
| Observability & Analytics | 31-35 | 5 |
| Data, ML & Experimentation | 36-40 | 5 |
| Developer Experience | 41-45 | 5 |
| Governance & Platform | 46-49 | 4 |

## Phased Execution Strategy

### Phase 1: Foundation (Weeks 1-4)
**Focus:** Establish baselines and critical infrastructure

| Prompt | Priority | Dependencies | Owner |
|--------|----------|--------------|-------|
| P17: Performance Benchmark | P0 | None | Platform |
| P22: Observability Reliability | P0 | None | SRE |
| P26: Security Baseline | P0 | None | Security |
| P31: Metrics Taxonomy | P0 | None | Platform |
| P49: Ownership Matrix | P0 | None | Leadership |

**Exit Criteria:**
- [ ] Benchmark suite running in CI
- [ ] SLOs defined for critical paths
- [ ] Security baseline checks passing
- [ ] Metrics naming standardized
- [ ] All subsystems have owners

### Phase 2: Hardening (Weeks 5-8)
**Focus:** Security, builds, and deployment safety

| Prompt | Priority | Dependencies | Owner |
|--------|----------|--------------|-------|
| P18: Hot Path Profiling | P1 | P17 | Platform |
| P19: Load Testing | P0 | P17 | Platform |
| P23: Build Optimization | P1 | None | DevOps |
| P24: Canary Rollback | P0 | None | Platform |
| P27: Threat Modeling | P0 | P26 | Security |
| P28: Secrets Management | P0 | None | Security |
| P32: Distributed Tracing | P0 | P31 | Platform |

**Exit Criteria:**
- [ ] Hot paths identified with refactor plans
- [ ] Load tests running weekly
- [ ] Build times reduced 50%+
- [ ] Canary deployments working
- [ ] Threat model complete
- [ ] Secrets in vault
- [ ] End-to-end traces visible

### Phase 3: Governance (Weeks 9-12)
**Focus:** Compliance, analytics, and standards

| Prompt | Priority | Dependencies | Owner |
|--------|----------|--------------|-------|
| P20: Caching Strategy | P1 | P18 | Platform |
| P21: Resource Budgeting | P1 | P19 | Platform |
| P25: Dependency Hygiene | P1 | None | Platform |
| P29: SBOM Signing | P1 | P28 | Security |
| P30: License Compliance | P1 | None | Legal |
| P33: Log Management | P1 | P32 | Platform |
| P46: Policy Engine | P1 | P26, P27 | Platform |

**Exit Criteria:**
- [ ] Caching implemented for hot paths
- [ ] Resource budgets enforced
- [ ] Dependencies up to date
- [ ] SBOMs signed and verified
- [ ] License compliance automated
- [ ] Log costs reduced
- [ ] Policy engine operational

### Phase 4: Experience (Weeks 13-16)
**Focus:** Data, DX, and operational excellence

| Prompt | Priority | Dependencies | Owner |
|--------|----------|--------------|-------|
| P34: Realtime Analytics | P2 | P31, P32 | Data |
| P35: Anomaly Detection | P2 | P31 | Platform |
| P36: Data Lineage | P1 | None | Data |
| P37: Experimentation | P2 | P36 | Product |
| P38: Mock Data Factory | P1 | None | QA |
| P39: Model Reproducibility | P2 | None | ML |
| P40: Data Privacy | P0 | P36 | Privacy |
| P41: DX Feedback | P2 | None | DX |
| P42: Accessibility | P1 | None | Frontend |
| P43: UX Guidelines | P2 | None | Design |
| P44: Developer Portal | P2 | None | DX |
| P45: Code Review Quality | P1 | None | Engineering |
| P47: Platform Abstraction | P1 | P46 | Platform |
| P48: Documentation QA | P1 | None | DX |

**Exit Criteria:**
- [ ] All Phase 4 prompts at least 80% complete
- [ ] Developer feedback system operational
- [ ] Documentation quality standards enforced
- [ ] Data lineage visible

## Dependency Graph

```
P17 (Benchmark)
  └── P18 (Profiling)
        └── P20 (Caching)
  └── P19 (Load Testing)
        └── P21 (Budgeting)

P26 (Security Baseline)
  └── P27 (Threat Model)
        └── P46 (Policy Engine)
                └── P47 (Abstraction)
  └── P28 (Secrets)
        └── P29 (SBOM)

P31 (Metrics)
  └── P32 (Tracing)
        └── P33 (Logs)
        └── P34 (Analytics)
        └── P35 (Anomaly)

P36 (Lineage)
  └── P37 (Experimentation)
  └── P40 (Privacy)

P49 (Ownership) ← Foundation for all
```

## Resource Allocation

### Team Assignments

| Team | Primary Prompts | Support Prompts |
|------|-----------------|-----------------|
| Platform | 17-25, 31-33, 46-47 | All |
| Security | 26-30 | 40, 46 |
| Data | 34-40 | 31-33 |
| Frontend | 42-44 | 41, 45 |
| DX | 41, 44-45, 48 | 42-43 |
| Leadership | 49 | All |

### Capacity Planning

```
Phase 1: 2-3 engineers per prompt, 4 prompts active
Phase 2: 2 engineers per prompt, 7 prompts active
Phase 3: 1-2 engineers per prompt, 7 prompts active
Phase 4: 1 engineer per prompt, 14 prompts active
```

## Risk Management

### High Risk Items
| Risk | Mitigation | Owner |
|------|------------|-------|
| Performance regression | Benchmark gating in CI | Platform |
| Security vulnerability | Blocking checks | Security |
| Breaking changes | Feature flags, canary | Platform |
| Data loss | Backup verification | Data |

### Contingency Plans
- All prompts have documented rollback procedures
- Emergency bypass for blocking checks
- Parallel execution paths if dependencies blocked

## Communication Plan

### Regular Updates
- **Daily:** Slack standup per prompt
- **Weekly:** Cross-prompt sync, blockers
- **Bi-weekly:** Stakeholder demo
- **Monthly:** Executive summary

### Artifacts
- Each prompt produces PR with deliverables
- Checklists signed off before closing
- Documentation updated before completion

## Success Metrics

### Phase Completion
- Phase 1: 100% of P0 items complete
- Phase 2: 100% of P0, 80% of P1 items
- Phase 3: 100% of P0-P1, 50% of P2 items
- Phase 4: All items complete or documented deferral

### Quality Gates
- No critical security issues
- No P0 bugs in new functionality
- Documentation reviewed and approved
- Tests passing with >80% coverage

## Quick Reference

### Prompt Lookup by ID

| ID | Name | Location |
|----|------|----------|
| P17 | Performance Benchmark | `performance/plan.performance-benchmark@v1.yaml` |
| P18 | Hot Path Profiling | `performance/plan.hot-path-profiling@v1.yaml` |
| P19 | Load Testing | `performance/plan.load-testing@v1.yaml` |
| P20 | Caching Strategy | `performance/plan.caching-strategy@v1.yaml` |
| P21 | Resource Budgeting | `performance/plan.resource-budgeting@v1.yaml` |
| P22 | Observability Reliability | `performance/plan.observability-reliability@v1.yaml` |
| P23 | Build Optimization | `performance/plan.build-artifact-optimization@v1.yaml` |
| P24 | Canary Rollback | `performance/plan.canary-rollback@v1.yaml` |
| P25 | Dependency Hygiene | `performance/plan.dependency-hygiene@v1.yaml` |
| P26 | Security Baseline | `security/plan.security-baseline@v1.yaml` |
| P27 | Threat Modeling | `security/plan.threat-modeling@v1.yaml` |
| P28 | Secrets Management | `security/plan.secrets-management@v1.yaml` |
| P29 | SBOM Signing | `security/plan.sbom-signing@v1.yaml` |
| P30 | License Compliance | `security/plan.license-compliance@v1.yaml` |
| P31 | Metrics Taxonomy | `observability/plan.metrics-taxonomy@v1.yaml` |
| P32 | Distributed Tracing | `observability/plan.distributed-tracing@v1.yaml` |
| P33 | Log Management | `observability/plan.log-management@v1.yaml` |
| P34 | Realtime Analytics | `observability/plan.realtime-analytics@v1.yaml` |
| P35 | Anomaly Detection | `observability/plan.anomaly-detection@v1.yaml` |
| P36 | Data Lineage | `data/plan.data-lineage@v1.yaml` |
| P37 | Experimentation | `data/plan.experimentation@v1.yaml` |
| P38 | Mock Data Factory | `data/plan.mock-data-factory@v1.yaml` |
| P39 | Model Reproducibility | `data/plan.model-reproducibility@v1.yaml` |
| P40 | Data Privacy | `data/plan.data-privacy@v1.yaml` |
| P41 | DX Feedback | `dx/plan.dx-feedback@v1.yaml` |
| P42 | Accessibility | `dx/plan.accessibility-automation@v1.yaml` |
| P43 | UX Guidelines | `dx/plan.ux-guidelines@v1.yaml` |
| P44 | Developer Portal | `dx/plan.developer-portal@v1.yaml` |
| P45 | Code Review Quality | `dx/plan.code-review-quality@v1.yaml` |
| P46 | Policy Engine | `governance/plan.policy-engine@v1.yaml` |
| P47 | Platform Abstraction | `governance/plan.platform-abstraction@v1.yaml` |
| P48 | Documentation QA | `governance/plan.documentation-qa@v1.yaml` |
| P49 | Ownership Matrix | `governance/plan.ownership-matrix@v1.yaml` |

---

*Last Updated: 2025-11-25*
*Owner: Platform Engineering*
