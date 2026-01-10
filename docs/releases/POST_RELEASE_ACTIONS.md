# Post-Release Action Items (MVP-4 GA)

This document tracks the carry-forward action items that were explicitly deferred during the MVP-4 GA release. It serves as a bounded backlog, not a roadmap.

**DO NOT ADD NEW SCOPE.**

---

## Deferred Items from `MVP4-GA-MASTER-CHECKLIST.md`

### Week 1 (Critical)

*   [ ] **Enable `pnpm audit` in CI**
    *   **Owner:** Security Lead
    *   **Sunset:** End of Week 1 Post-GA
*   [ ] **Define Error Budgets in Prometheus**
    *   **Owner:** SRE Lead
    *   **Sunset:** End of Week 1 Post-GA
*   [ ] **Create ADR-009 (MVP-4-GA decisions)**
    *   **Owner:** Chief Architect
    *   **Sunset:** End of Week 1 Post-GA
*   [ ] **Monitor SLOs hourly for 72h**
    *   **Owner:** On-Call SRE
    *   **Sunset:** T+72h
*   [ ] **Zero P0 incidents**
    *   **Owner:** All
    *   **Sunset:** N/A (Ongoing)

### Month 1 (High Priority)

*   [ ] **Resolve Jest/ts-jest issues (or migrate to tsx/node:test)**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Month 1 Post-GA
*   [ ] **Achieve 100% test pass rate**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Month 1 Post-GA
*   [ ] **API determinism audit (eliminate unhandled 500s)**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Month 1 Post-GA
*   [ ] **Type safety audit (eliminate `any` in core paths)**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Month 1 Post-GA

### Quarter 1 (Medium Priority)

*   [ ] **Formal error budgets (Terraform-managed)**
    *   **Owner:** SRE Lead
    *   **Sunset:** End of Q1 Post-GA
*   [ ] **Adaptive rate limiting**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Q1 Post-GA
*   [ ] **Executable runbooks (Jupyter/Script)**
    *   **Owner:** SRE Lead
    *   **Sunset:** End of Q1 Post-GA
*   [ ] **Graceful degradation modes**
    *   **Owner:** Dev Lead
    *   **Sunset:** End of Q1 Post-GA
