# Tech Debt Backlog Triage — Q4 2025

**Date:** November 20, 2025
**Sprint Context:** Q4 2025 Sprint Series (Oct 1 - Nov 25, 2025)
**Current Status:** Sprint 2-3 timeframe; working toward GA-ready core with provenance, governance, and tri-pane UX

---

## Current Quarter Objectives (Q1 OKRs)

**O1: Ship MVP with >90% green path success**
- KR: 5 critical runbooks operational
- KR: p95 query latency <1.5s

**O2: Data coverage & scale**
- KR: 10 connectors live
- KR: 10k+ entities, 100k+ relationships

**O3: Trust & safety**
- KR: Zero critical vulnerabilities
- KR: ABAC enforced across platform
- KR: Provenance on 100% writes

---

## Tech Debt Inventory & Prioritization Matrix

| ID | Name | Risk | Effort | Impact_on_Objectives | Priority_Score | Notes |
|---|---|---|---|---|---|---|
| **TD-007** | Security audit & vulnerability remediation | **High** | M | **Critical** (O3) | **10/10** | 100+ outdated packages = unknown vulns; blocks O3 KR |
| **TD-002** | Patch/minor dependency updates (100+ pkgs) | Medium | M | **High** (O3) | **9/10** | Required for zero-critical-vulns KR; lower risk than majors |
| **TD-005** | Test infrastructure standardization | Medium | M | **High** (O1) | **8/10** | Centralized coverage reporting supports >90% green path KR |
| **TD-001** | Major dependency updates (Apollo 4, React 19) | **High** | L | Medium-High (O1, O3) | 7/10 | Breaking changes risk; deferred until after GA Sprint 4 |
| **TD-009** | SBOM generation & supply chain hardening | Medium | M | **High** (O3) | 7/10 | Trust & safety compliance; aligns with Sprint 1-4 provenance work |
| **TD-004** | Large file management / Git LFS migration | Medium | M | Medium (O1) | 6/10 | 18 files >25MB slow CI; impacts dev velocity |
| **TD-003** | Branch cleanup (15+ stale branches) | Low | **S** | Low | 5/10 | Quick win; improves clarity, no functional risk |
| **TD-006** | CI/CD workflow consolidation (68→40) | Low | L | Medium (O1) | 5/10 | Optimization opportunity; lower priority vs. functional work |
| **TD-008** | Monorepo structure documentation | Low | **S** | Low | 4/10 | Onboarding aid; no impact on OKRs |
| **TD-010** | Development experience (.devcontainer, Taskfile) | Low | S-M | Low | 3/10 | Developer quality-of-life; nice-to-have |

**Risk Scale:** High = likelihood × impact threatens OKR delivery; Medium = moderate impact/likelihood; Low = minimal impact
**Effort Scale:** S = <3 days; M = 3-7 days; L = 1-2 sprints
**Priority Score:** Weighted combination of Risk + Impact on OKRs + Urgency

---

## Top 5 Items for Next 1–2 Sprints

### 1. TD-007: Security Audit & Vulnerability Remediation (Priority: 10/10)

**Why now:**
- **O3 KR blocker:** "Zero critical vulnerabilities" cannot be achieved without comprehensive audit
- **High risk:** 100+ outdated packages represent unknown security surface
- **Sprint alignment:** Aligns with Sprint 1 (ABAC/RBAC) and Sprint 4 (GA hardening, STRIDE pass)
- **Effort-to-impact ratio:** Medium effort (M) for critical impact

**Recommended action:** Run `npm audit`, `pnpm audit`, and Trivy scans; triage findings; remediate criticals immediately, plan for high/medium vulns.

---

### 2. TD-002: Patch/Minor Dependency Updates (Priority: 9/10)

**Why now:**
- **O3 enabler:** Lower-risk path to reducing vulnerability surface before tackling major version updates
- **Foundation for TD-007:** Many vulnerabilities are fixed in patch/minor releases
- **Low breaking-change risk:** Semver-compliant updates are safer than major version jumps
- **Sprint 4 readiness:** Clean dependency tree supports GA hardening checklist

**Recommended action:** Automated update of non-breaking dependencies (typescript-eslint 8.40→8.41, etc.); validate with existing test suite; monitor for regressions.

---

### 3. TD-005: Test Infrastructure Standardization (Priority: 8/10)

**Why now:**
- **O1 KR enabler:** ">90% green path success" requires visibility into coverage gaps
- **Current gap:** Scattered test configs, no centralized coverage reporting
- **Sprint alignment:** Supports Sprint 1-4 DoD requirements (all acceptance tests pass, observability validated)
- **Risk mitigation:** Standardized testing catches regressions early in GA push

**Recommended action:** Consolidate Jest/Playwright/pytest configs; implement centralized coverage reporting (Codecov/SonarQube); add CI artifacts for test results.

---

### 4. TD-009: SBOM Generation & Supply Chain Hardening (Priority: 7/10)

**Why now:**
- **O3 alignment:** "Trust & safety" includes supply chain provenance
- **Sprint 1 synergy:** Provenance & Claim Ledger work extends to software supply chain
- **Compliance ready:** SBOM generation supports federal/enterprise security requirements (aligns with SLSA attestation work in OKRs)
- **Moderate effort:** CycloneDX tooling already partially present (per repo health report)

**Recommended action:** Automate SBOM generation in CI/CD; implement container signing pipeline; integrate with existing provenance ledger.

---

### 5. TD-003: Branch Cleanup (Priority: 5/10)

**Why now:**
- **Quick win:** Small effort (S), immediate clarity improvement
- **Developer productivity:** 52 branches (15+ stale) create confusion, slow Git operations
- **Housekeeping before GA:** Clean repository state supports Sprint 4 GA release
- **Low risk:** Archive-only operation with clear rollback path

**Recommended action:** Identify merged/stale branches via `git branch --merged`; confirm with team; archive to tags (`archive/branch-name`); document active branch lifecycle policy.

---

## Quick-Wins vs. Deep Work

### Quick Wins (≤1 Sprint, High ROI)

| Item | Effort | Why Quick Win |
|---|---|---|
| **TD-003: Branch cleanup** | S (1-2 days) | Low risk, immediate clarity; supports GA housekeeping |
| **TD-002: Patch/minor updates** | M (3-5 days) | Automated tooling (pnpm update); clear semver guarantees; high security ROI |
| **TD-008: Monorepo docs** | S (2-3 days) | Documentation-only; no code changes; improves onboarding |

**Recommendation:** Tackle TD-003 and TD-008 in parallel in a single sprint; stack TD-002 afterward to build momentum.

---

### Deep Work (Multi-Sprint, Strategic Investment)

| Item | Effort | Why Deep Work |
|---|---|---|
| **TD-007: Security audit** | M (5-7 days) | Requires triage, remediation, validation; multi-phase rollout |
| **TD-005: Test standardization** | M (5-7 days) | Consolidation across Jest/Playwright/pytest; coverage integration; CI updates |
| **TD-009: SBOM/supply chain** | M (4-6 days) | Tooling integration; signing pipeline; provenance ledger hookup |
| **TD-001: Major dep updates** | L (1-2 sprints) | Apollo 4.x and React 19 have breaking changes; extensive refactoring + testing |
| **TD-006: CI/CD consolidation** | L (1-2 sprints) | 68 workflows require careful analysis; consolidation risks breaking existing automation |

**Recommendation:** Sequence deep work across next 2 sprints:
- **Sprint 1 (Now-2 weeks):** TD-007 (security audit) + TD-002 (updates) + TD-003 (branch cleanup)
- **Sprint 2 (2-4 weeks):** TD-005 (test standardization) + TD-009 (SBOM) + TD-008 (docs)
- **Post-GA (Sprint 5+):** TD-001 (major updates), TD-006 (CI/CD), TD-004 (Git LFS)

---

## Risk-Adjusted Sequencing Rationale

1. **Security first (TD-007, TD-002):** O3's "zero critical vulns" is non-negotiable for GA; address before Sprint 4 hardening
2. **Test infrastructure (TD-005):** Enables confidence in all other changes; foundational for O1's ">90% green path"
3. **Supply chain (TD-009):** Leverage Sprint 1's provenance work; extends trust model to dependencies
4. **Quick wins (TD-003, TD-008):** Intersperse low-effort items to maintain velocity and morale
5. **Defer breaking changes (TD-001, TD-006):** Apollo 4/React 19 and CI/CD overhaul introduce instability; tackle post-GA when platform is stable

---

## Alignment with Q4 Sprint Series

| Sprint | Tech Debt Items | Rationale |
|---|---|---|
| **Sprint 1 (Oct 1-14)** | TD-003 (branch cleanup) | Housekeeping alongside LAC/Provenance foundation work |
| **Sprint 2 (Oct 15-28)** | TD-007 (security audit), TD-002 (updates) | Security hardening before UX/analytics surface expands |
| **Sprint 3 (Oct 29-Nov 11)** | TD-005 (test standardization), TD-009 (SBOM) | Test/observability support for Case Spaces & Runbooks; SBOM for cost guard provenance |
| **Sprint 4 (Nov 12-25)** | *Validation only* | Focus on GA hardening (STRIDE, accessibility, soak tests); no new tech debt work |

---

## Success Metrics

- **TD-007/TD-002:** Zero critical/high vulnerabilities in `npm audit` + Trivy scans
- **TD-005:** Centralized coverage dashboard live; >80% code coverage baseline established
- **TD-009:** SBOM auto-generated in CI; container images signed; provenance ledger integration complete
- **TD-003:** Branch count reduced from 52 → <30; lifecycle policy documented

---

## Conclusion

The top 5 tech debt items are sequenced to:
1. **Unblock O3 (Trust & Safety)** via security audit and dependency updates
2. **Enable O1 (MVP Success)** via test infrastructure standardization
3. **Extend provenance model** via SBOM/supply chain hardening
4. **Maintain momentum** with quick-win branch cleanup

This plan balances **immediate risk mitigation** (security), **strategic enablement** (testing/SBOM), and **low-hanging fruit** (branch cleanup) to support the Q4 Sprint Series GA push without introducing instability.

---

_Report generated: November 20, 2025_
_Next review: Post-Sprint 4 (Dec 2025)_
